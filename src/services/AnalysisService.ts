import { analysisAPI } from "../config";
import CodeReview from "../models/CodeReview";

class AnalysisService {
  public async getAnalysisOutput(owner: string, repo: string, pull_number: number): Promise<CodeReview> {
    const analysis = await fetch(
      `${analysisAPI}/codeReview?owner=${owner}&repo=${repo}&pull_number=${pull_number}`
    )
      .then((response) => {        
        return response.json();
      })
      .then((data) => {
        const cdata = new CodeReview(data)       
        return cdata
      })
      .catch((error) => console.error(error));

    if (!analysis) throw new Error("Analysis not found");
    return analysis;
  }
}

export default AnalysisService;
