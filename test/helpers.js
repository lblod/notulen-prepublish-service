// @ts-strict-ignore

import fs from 'fs';
import factory from '@rdfjs/dataset';
import { Parser as ParserN3 } from 'n3';
import { RdfaParser } from 'rdfa-streaming-parser';

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
      } else if (quad) {
        dataset.add(quad);
      } else {
        resolve(dataset);
      }
    });
  });
}

export function htmlToRdf(html) {
  return new Promise((res, rej) => {
    const myParser = new RdfaParser({ contentType: 'text/html' });
    const dataset = factory.dataset();
    myParser
      .on('data', (data) => {
        dataset.add(data);
      })
      .on('error', rej)
      .on('end', () => res(dataset));
    myParser.write(html);
    myParser.end();
  });
}

function shaclSeverityToString(severity) {
  const uri = severity.value;
  return uri.replace('http://www.w3.org/ns/shacl#', '');
}

export function shaclReportToMessage(report) {
  let reportString = '\n';
  for (const r of report.results) {
    const severity = shaclSeverityToString(r.severity);
    reportString += `${severity} - ${r.path.value} (${r.focusNode.value})\n`;
  }
  return reportString;
}
