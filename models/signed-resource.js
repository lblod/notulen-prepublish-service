// @ts-ignore
import {prefixMap} from "../support/prefixes";
import {query, sparqlEscapeUri} from "mu";

export default class SignedResource {
  static async findURI(uri) {
    const queryString = `
    ${prefixMap.get("mu").toSparqlString()}
    ${prefixMap.get("sign").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}
    SELECT ?uri ?uuid ?content ?signatory ?signatoryRole ?created ?hashValue ?hashAlgorithm
    WHERE {
      BIND(${sparqlEscapeUri(uri)} as ?uri)
        ?uri a sign:SignedResource;
        mu:uuid ?uuid;
        sign:text ?content;
        sign:signatory ?signatory;
        sign:signatoryRoles ?signatoryRole;
        dct:created ?created;
        sign:status publicationStatus:unpublished;
        sign:hashAlgorithm ?hashAlgorithm;
        sign:hashValue ?hashValue.
        dct:subject ?subject.
    }
   `;
    try {
      const result = await query(queryString);
      if (result.results.bindings.length === 1) {
        const sr = SignedResource.fromBinding(result.results.bindings[0]);
        return sr;
      }
      else {
        throw `did not find signed resource with uri ${uri}`;
      }
    }
    catch(e) {
      console.error(e);
      throw `failed to retrieve signed resource with uri ${uri}`;
    }
  }

  static fromBinding({
    uuid,
    uri,
    html,
    signatory,
    signatoryRole,
    created,
    hashValue,
    hashAlgorithm,
  }) {
    return new SignedResource({
      uuid: uuid.value,
      uri: uri.value,
      html : html.value,
      created : created.value,
      signatoryRole: signatoryRole.value,
      signatory: signatory.value,
      hashAlgorithm: hashAlgorithm.value,
      hashValue: hashValue.value
    });
  }

  constructor({
    uuid,
    uri,
    html,
    signatory,
    signatoryRole,
    created,
    hashAlgorithm,
    hashValue
  }) {
    this.uuid = uuid;
    this.uri = uri;
    this.html = html;
    this.signatory = signatory;
    this.created = created;
    this.signatoryRole = signatoryRole;
    this.hashAlgorithm = hashAlgorithm;
    this.hashValue = hashValue;
  }
}
