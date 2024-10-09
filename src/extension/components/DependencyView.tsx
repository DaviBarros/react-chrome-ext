import { createElement, useEffect, useState } from "react";
import AnalysisService from "../../services/AnalysisService";
import { Diff2HtmlConfig, html as diffHtml } from "diff2html";
import { ColorSchemeType } from "diff2html/lib/types";

const analysisService = new AnalysisService();
const linesToExpand = 3;

const diffConfig: Diff2HtmlConfig = {
  outputFormat: "side-by-side",
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

type diffType = { base_a: string; base_b: string; merge: string };

export default function DependencyView({ owner, repository, pull_number }: DependencyViewProps) {
  const [diffs, setDiffs] = useState<diffType | null>(null);
  const [nomesbranch, setNomesBranch] = useState<string[]>([]);
  const [diffFiles, setDiffFiles] = useState<Element[]>([]);

  useEffect(() => {
    getAnalysisOutput(owner, repository, pull_number).then((response) => {
      let diffs = response.getDiffs();
      setDiffs(diffs);
      setNomesBranch([response.branch_a, response.branch_b]);
    });
  }, [owner, repository, pull_number]);

  useEffect(() => {
    if (!diffs) return;

    const groupFiles = () => {
      const diff_a = diffHtml(diffs.base_a, diffConfig);
      const diff_b = diffHtml(diffs.base_b, diffConfig);
      const diff_merge = diffHtml(diffs.merge, diffConfig);

      const diffElemA = document.createElement("div");
      diffElemA.innerHTML = diff_a;
      const diffElemB = document.createElement("div");
      diffElemB.innerHTML = diff_b;
      const diffElemMerge = document.createElement("div");
      diffElemMerge.innerHTML = diff_merge;

      const diffFilesA = diffElemA.querySelectorAll(".d2h-file-wrapper");
      const diffFilesB = diffElemB.querySelectorAll(".d2h-file-wrapper");
      const diffFilesMerge = diffElemMerge.querySelectorAll(".d2h-file-wrapper");

      const allFiles = Array.from(diffFilesA)
        .concat(Array.from(diffFilesB))
        .concat(Array.from(diffFilesMerge));

      const filenames = [
        ...new Set(
          allFiles
            .map((file) => {
              return file.querySelector(".d2h-file-name")?.textContent;
            })
            .filter((filename) => filename !== undefined)
            .sort()
        )
      ];

      const allFilesGrouped = filenames.map((filename) => {
        const fileA = Array.from(diffFilesA).filter(
          (file) => file.querySelector(".d2h-file-name")?.textContent === filename
        );
        const fileB = Array.from(diffFilesB).filter(
          (file) => file.querySelector(".d2h-file-name")?.textContent === filename
        );
        const fileMerge = Array.from(diffFilesMerge).filter(
          (file) => file.querySelector(".d2h-file-name")?.textContent === filename
        );

        const fileDiffs = fileA.concat(fileB).concat(fileMerge);

        const fileGroup = document.createElement("div");
        fileDiffs.forEach((file, index) => {
          const title = document.createElement("h4");
          title.textContent = nomesbranch[index] ?? "Merge";
          fileGroup.appendChild(title);
          fileGroup.appendChild(file);
        });
        return fileGroup;
      });

      console.log("filenames", filenames);
      console.log(allFilesGrouped);

      setDiffFiles(allFilesGrouped);
    };
    groupFiles();
  }, [diffs, nomesbranch]);

  // return (
  //   <>
  //     <div>
  //       <h4>{nomesbranch[0]}</h4>
  //       {diffs &&
  //         createElement("div", { dangerouslySetInnerHTML: { __html: diffHtml(diffs.base_a, diffConfig) } })}
  //     </div>
  //     <div>
  //       <h4>{nomesbranch[1]}</h4>
  //       {diffs &&
  //         createElement("div", { dangerouslySetInnerHTML: { __html: diffHtml(diffs.base_b, diffConfig) } })}
  //     </div>
  //     <div>
  //       <h4>Merge</h4>
  //       {diffs &&
  //         createElement("div", { dangerouslySetInnerHTML: { __html: diffHtml(diffs.merge, diffConfig) } })}
  //     </div>
  //   </>
  // );

  return (
    <>
      <div>
        <h1>Diff</h1>
        {diffFiles.map((diffFile, index) => {
          return (
            <div key={index}>
              {createElement("div", { dangerouslySetInnerHTML: { __html: diffFile.innerHTML } })}
            </div>
          );
        })}
      </div>
    </>
  );
}
