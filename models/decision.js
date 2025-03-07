// @ts-strict-ignore

import { analyse } from '@lblod/marawa/rdfa-context-scanner';
import { cleanupTriples } from "../support/pre-importer.js";
import { editorDocumentFromUuid } from "../support/editor-document.js";

export default class Decision {
  static async extractDecisionsFromDocument(editorDocumentUuid, previewType) {
    const doc = await editorDocumentFromUuid(editorDocumentUuid, previewType);
    const decisions = [];
    if (doc) {
      const contexts = analyse(doc.getTopDomNode()).map((c) => c.context);
      const triples = cleanupTriples(contexts.flat());
      const decisionUris = triples
        .filter(
          (t) =>
            (t.predicate === 'a' ||
              t.predicate ===
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') &&
            t.object === 'http://data.vlaanderen.be/ns/besluit#Besluit'
        )
        .map((b) => b.subject);
      for (const uri of decisionUris) {
        const decision = Decision.fromTriples(
          triples.filter((t) => t.subject === uri)
        );
        decisions.push(decision);
      }
    }
    return decisions;
  }

  // assumes triples has already been filter on the correct subject
  static fromTriples(triples) {
    const titleTriple = triples.find(
      (t) => t.predicate === 'http://data.europa.eu/eli/ontology#title'
    );
    const title = titleTriple?.object;
    const descriptionTriple = triples.find(
      (t) => t.predicate === 'http://data.europa.eu/eli/ontology#description'
    );
    const description = descriptionTriple?.object;
    const types = triples
      .filter(
        (t) =>
          t.predicate === 'a' ||
          t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      )
      .map((type) => type.object);
    const uri = triples[0].subject;
    return new Decision({ title, description, types, uri });
  }

  constructor({ uri, title, description, types }) {
    this.uri = uri;
    this.title = title;
    this.description = description;
    this.types = types;
    this.typesAsText = types.join(' ');
  }
}
