/**
 * Represents an rdfa-document as entered by the user in the frontend.
 */

import { query, sparqlEscapeString } from 'mu';
import jsdom from 'jsdom';

class EditorDocument {
  constructor(content) {
    for( var key in content )
      this[key] = content[key];
  }

  // uri = null
  // title = null
  // context = null
  // content = null

  getDom() {
    if( this.dom ) {
      return this.dom;
    }
    else {
      const dom = new jsdom.JSDOM( `<body>${this.content}</body>` );
      this.dom = dom;
      return dom;
    }
  }

  getTopDomNode() {
    if( this.topDomNode ) {
      return this.topDomNode;
    } else {
      const dom = this.getDom();
      const topDomNode = dom.window.document.querySelector('body');
      topDomNode.setAttribute( 'vocab', this.context.vocab );
      topDomNode.setAttribute( 'prefix', ( () => {
        var str = "";
        for( var key in this.context.prefix )
          if( key != "" )
            str += `${key}: ${this.context.prefix[key]} `;
        return str;
      } )() );

      this.topDomNode = topDomNode;
      return topDomNode;
    }
  }

  resetDom(){
    this.dom = undefined;
    this.topDomNode = undefined;
  }
}

/**
 * Retrieves the EditorDocument belonging to the supplied uuid
 *
 * @method editorDocumentFromUuid
 *
 * @param {string} uuid UUID which is coupled to the EditorDocument as
 * mu:uuid property.
 *
 * @return {Promise} Promise which resolves to an object representing
 * the EditorDocument
 */
async function editorDocumentFromUuid( uuid ){
  // We have removed dc:title from here
  const queryResult = await query(
    `PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
     SELECT * WHERE {
     GRAPH <http://mu.semte.ch/application> {
       ?uri a <http://mu.semte.ch/vocabularies/ext/EditorDocument>;
            ext:editorDocumentContent ?content;
            ext:editorDocumentContext ?context;
            <http://mu.semte.ch/vocabularies/core/uuid> ${sparqlEscapeString( uuid )}
       }
     }`);
  
  if( queryResult.results.bindings.length === 0 )
    throw `No content found for EditorDocument ${uuid}`;
  const result = queryResult.results.bindings[0];

  const doc = new EditorDocument({
    uri: result.uri.value,
    // title: result.title,
    context: JSON.parse( result.context.value ),
    content: result.content.value
  });

  return doc;
}


export default EditorDocument;
export { editorDocumentFromUuid };
