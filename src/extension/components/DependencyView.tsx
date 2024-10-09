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

type diffType = {base_a:string, base_b: string, merge: string}

export default function DependencyView({ owner, repository, pull_number }: DependencyViewProps) {

  const [diffs, setDiffs] = useState<diffType | null>(null); 
  const [nomesbranch, setNomesBranch] = useState<string[]>([]); 

  useEffect(() => {
    getAnalysisOutput(owner, repository, pull_number).then((response) => {
      let diffs = response.getDiffs();
      setDiffs(diffs);
      setNomesBranch([response.branch_a, response.branch_b])
    })
  }, [owner, repository, pull_number]);

  return <>

    
    <div><h4>{nomesbranch[0]}</h4>{ diffs&&createElement("div",{dangerouslySetInnerHTML:{__html:diffHtml(diffs.base_a,diffConfig)}}) }</div>
    <div><h4>{nomesbranch[1]}</h4>{ diffs&&createElement("div",{dangerouslySetInnerHTML:{__html:diffHtml(diffs.base_b,diffConfig)}}) }</div>
    <div><h4>Merge</h4>{ diffs&&createElement("div",{dangerouslySetInnerHTML:{__html:diffHtml(diffs.merge,diffConfig)}}) }</div>

  </>
}
