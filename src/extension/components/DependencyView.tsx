import { createElement, useEffect, useState } from "react";
import AnalysisService from "../../services/AnalysisService";
import { dependency, modLine } from "../../models/AnalysisOutput";
import { Diff2HtmlConfig, html as diffHtml } from "diff2html";
import { ColorSchemeType } from "diff2html/lib/types";
import { gotoDiffConflict, removeHighlight } from "../utils/diff-navigation";
import Conflict from "./Conflict";

const analysisService = new AnalysisService();

const diffConfig: Diff2HtmlConfig = {
  outputFormat: "line-by-line",
  drawFileList: true,
  renderNothingWhenEmpty: true,
  matching: "words",
  diffStyle: "word",
  colorScheme: ColorSchemeType.AUTO
};

async function getAnalysisOutput(owner: string, repository: string, pull_number: number) {
  return await analysisService.getAnalysisOutput(owner, repository, pull_number);
}

interface DependencyViewProps {
  owner: string;
  repository: string;
  pull_number: number;
}

export default function DependencyView({ owner, repository, pull_number }: DependencyViewProps) {
  const [dependencies, setDependencies] = useState<dependency[]>([]);
  const [diff, setDiff] = useState<string>("");
  const [modifiedLines, setModifiedLines] = useState<modLine[]>([]);
  const [activeConflict, setActiveConflict] = useState<HTMLElement[]>([]); // lines of the active conflict

  const changeActiveConflict = (dep: dependency) => {
    // remove the styles from the previous conflict
    if (activeConflict.length) {
      activeConflict.forEach((line) => {
        line.querySelectorAll("td").forEach((td) => {
          td.classList.remove("d2h-ins-left");
          td.classList.remove("d2h-ins");
          td.classList.remove("d2h-del-left");
          td.classList.remove("d2h-del");
        });
        removeHighlight(line);
      });
    }

    // get the filename and line numbers of the conflict
    let file = dep.body.interference[0].location.file.replaceAll("\\", "/"); // filename
    let lineFrom = dep.body.interference[0]; // first line
    let lineTo = dep.body.interference[dep.body.interference.length - 1]; // last line

    if (file === "UNKNOWN") {
      // conflict in an unknown file
      // check if stack trace has a valid file
      if (
        !dep.body.interference[0].stackTrace ||
        !dep.body.interference[dep.body.interference.length - 1].stackTrace
      )
        throw new Error("File not found: Invalid stack trace");

      // get the stack trace file path
      let javaFilePath = dep.body.interference[0].stackTrace[0].class.replaceAll(".", "/");

      // assign the data based on stack trace
      file = `${javaFilePath}.java`;
      lineFrom.location.line = dep.body.interference[0].stackTrace[0].line;
      lineTo.location.line = dep.body.interference[dep.body.interference.length - 1].stackTrace![0].line;
    }

    // set the new conflict as active
    const newConflict = gotoDiffConflict(file, lineFrom, lineTo, modifiedLines);
    setActiveConflict(newConflict);
  };

  useEffect(() => {
    getAnalysisOutput(owner, repository, pull_number).then((response) => {
      setDependencies(
        response.getDependencies().sort((a, b) => {
          const aStartLine = a.body.interference[0].location.line;
          const bStartLine = b.body.interference[0].location.line;
          const aEndLine = a.body.interference[a.body.interference.length - 1].location.line;
          const bEndLine = b.body.interference[b.body.interference.length - 1].location.line;

          if (aStartLine < bStartLine) return -1;
          if (aStartLine > bStartLine) return 1;
          if (aEndLine < bEndLine) return -1;
          if (aEndLine > bEndLine) return 1;
          return 0;
        })
      );
      setDiff(response.getDiff());
      setModifiedLines(response.data.modifiedLines ?? []);
    });
  }, [owner, repository, pull_number]);

  useEffect(() => {
    const updateDiffColors = () => {
      const diffContainer = document.getElementById("diff-container");
      const diffFiles = diffContainer?.querySelectorAll(".d2h-file-wrapper");

      if (diffContainer && diffFiles) {
        // For each modified line, update the colors of the diff
        for (let modLine of modifiedLines) {
          const modLineFile = modLine.file;

          // get the diff element of the file
          const diffContent = Array.from(diffFiles).filter((diffFile) => {
            const fileName = diffFile.querySelector(".d2h-file-name")?.textContent;
            return fileName?.endsWith(modLineFile);
          })[0];
          if (!diffContent) throw new Error(`Diff not found for file ${modLineFile}`);

          // get the insertions and deletions
          const insertions = diffContent.querySelectorAll("tr:has(td.d2h-ins)");
          const deletions = diffContent.querySelectorAll("tr:has(td.d2h-del)");

          // update the colors of the insertions
          for (let line of insertions) {
            const lineNumber = line.querySelector(".line-num2")?.textContent;
            if (lineNumber && modLine.leftAdded.includes(Number.parseInt(lineNumber))) {
              // Line was added by left
              line.firstElementChild?.classList.remove("d2h-ins");
              line.firstElementChild?.classList.add("d2h-ins-left");
              line.lastElementChild?.classList.remove("d2h-ins");
              line.lastElementChild?.classList.add("d2h-ins-left");
            }
          }

          // update the colors of the deletions
          for (let line of deletions) {
            const lineNumber = line.querySelector(".line-num2")?.textContent;
            if (lineNumber && modLine.leftRemoved.includes(Number.parseInt(lineNumber))) {
              // Line was removed by left
              line.firstElementChild?.classList.remove("d2h-del");
              line.firstElementChild?.classList.add("d2h-del-left");
              line.lastElementChild?.classList.remove("d2h-del");
              line.lastElementChild?.classList.add("d2h-del-left");
            }
          }
        }
      }
    };
    updateDiffColors();
  }, [modifiedLines]);

  return (
    <div id="dependency-plugin" className="tw-flex tw-flex-row tw-justify-between">
      {dependencies.length ? (
        <div
          id="dependency-container"
          className="tw-min-w-fit tw-h-fit tw-mr-5 tw-py-2 tw-px-3 tw-border tw-border-gray-700 tw-rounded">
          <h3 className="tw-mb-5 tw-text-red-600">
            {dependencies.length} possíveis conflito{dependencies.length > 1 ? "s" : ""} identificado
            {dependencies.length > 1 ? "s" : ""}:
          </h3>
          <ul className="tw-list-none">
            {dependencies.map((d, i) => {
              return (
                <li>
                  <Conflict key={i} dependency={d} setConflict={changeActiveConflict} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : diff ? (
        <div id="no-dependencies">
          <p>Não foram encontradas dependências durante as análises.</p>
        </div>
      ) : null}

      {diff ? (
        <div id="diff-container" className="tw-mb-3 tw-w-full">
          <h1>Diff</h1>
          {createElement("div", { dangerouslySetInnerHTML: { __html: diffHtml(diff, diffConfig) } })}
        </div>
      ) : (
        <div id="no-analysis" className="tw-mb-3">
          <p>Não foi encontrado nenhum registro de execução das análises...</p>
          <p>É possível que a análise ainda esteja em andamento ou que não tenha sido executada.</p>
        </div>
      )}
    </div>
  );
}
