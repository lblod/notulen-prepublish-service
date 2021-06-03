import fs from 'fs';
import factory from '@rdfjs/dataset';
import { Parser as ParserN3 } from 'n3';
import { analyse as analyseRdfa } from '@lblod/marawa/rdfa-context-scanner';
import jsdom from 'jsdom';

export async function loadDataset(filepath) {
  const file = fs.readFileSync(filepath, 'utf-8');
  return await parse(file);
}

export async function parse(triples) {
  return new Promise((resolve, reject) => {
    const parser = new ParserN3();
    const dataset = factory.dataset();
    parser.parse(triples, (error, quad) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      else if(quad) {
        dataset.add(quad);
      }
      else {
        resolve(dataset);
      }
    });
  });
}

// TODO consider using other rdfa libraries, marawa might not be the best option for this
export async function htmlToRdf(html) {
  const dom = new jsdom.JSDOM( `<body>${html}</body>` );
  const topDomNode = dom.window.document.querySelector('body');
  const contexts = analyseRdfa(topDomNode).map(block => block.context).flat();
  const triples = contexts.map((t) => t.toNT()).join("\n");
  return await parse(triples);
}

function shaclSeverityToString(severity) {
  const uri = severity.value;
  return uri.replace("http://www.w3.org/ns/shacl#","");
}

export function shaclReportToMessage(report) {
  let reportString = "\n";
  for (const r of report.results) {
    const severity = shaclSeverityToString(r.severity);
    reportString += `${severity} - ${r.path.value} (${r.focusNode.value})\n`;
  }
  return reportString;
}
