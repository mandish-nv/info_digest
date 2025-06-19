export default function TextSummarizer(){
  

  return(
    <div>
      <h1>Text Summarizer</h1>
      <br/>
      <div>
        <span>Enter text</span>
        <textarea id="inputText"></textarea>
      </div>
      <div>
        <span>Summarized text</span>
        <span id="outputText"></span>
      </div>
      <button id="summarize">Summarize</button>
    </div>
  );
}