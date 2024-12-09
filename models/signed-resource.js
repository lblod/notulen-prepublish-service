// @ts-ignore
import { prefixMap } from '../support/prefixes';
import { query, sparqlEscapeUri } from 'mu';

export default class SignedResource {
  static async findURI(uri) {
    const queryString = `
    ${prefixMap['mu'].toSparqlString()}
    ${prefixMap['sign'].toSparqlString()}
    ${prefixMap['dct'].toSparqlString()}
    ${prefixMap['publicationStatus'].toSparqlString()}
    ${prefixMap['ext'].toSparqlString()}
    SELECT DISTINCT *
    WHERE {
      BIND(${sparqlEscapeUri(uri)} as ?uri)
        ?uri a sign:SignedResource;
             mu:uuid ?uuid;
             sign:hashValue ?hashValue;
             sign:hashAlgorithm ?hashAlgorithm;
             dct:created ?created;
             sign:signatoryRoles ?signatoryRole.
        
        ?uri sign:status ?blockchainStatus;
             sign:signatory ?signatory.
        
        ?blockchainStatus mu:uuid ?blockchainStatusUuid.
        ?signatory mu:uuid ?signatoryUuid.
        
        {
          { ?uri sign:text ?html. }
          UNION
          { ?uri prov:generated ?file. }
        }
        OPTIONAL { ?uri ext:deleted ?deleted. }
        OPTIONAL { 
           ?uri ext:signsAgenda ?agenda.
           ?agenda mu:uuid ?agendaUuid. 
        }
        OPTIONAL { 
          ?uri ext:signsBesluitenlijst ?versionedBesluitenLijst.
          ?versionedBesluitenLijst mu:uuid ?versionedBesluitenLijstUuid.
        }
        OPTIONAL { 
          ?uri ext:signsNotulen ?versionedNotulen.
          ?versionedNotulen mu:uuid ?versionedNotulenUuid.
        }
        OPTIONAL { 
          ?uri ext:signsBehandeling ?versionedBehandeling.
          ?versionedBehandeling mu:uuid ?versionedBehandelingUuid.
        }
      } ORDER BY DESC (?created)
   `;
    try {
      const result = await query(queryString);
      if (result.results.bindings.length === 1) {
        const sr = SignedResource.fromBinding(result.results.bindings[0]);
        return sr;
      } else if (result.results.bindings.length > 1) {
        console.warn(
          `Found ${result.results.bindings.length} SignedResources for one URI, this is unexpected. Returning the newest one`
        );
        // console.warn("bindings:", result.results.bindings);
        const sr = SignedResource.fromBinding(result.results.bindings[0]);
        return sr;
      } else {
        throw `did not find signed resource with uri ${uri}`;
      }
    } catch (e) {
      console.error(e);
      throw `failed to retrieve signed resource with uri ${uri}`;
    }
  }

  static fromBinding({
    uri,
    uuid,
    html,
    file,
    hashValue,
    hashAlgorithm,
    created,
    signatoryRole,
    deleted,
    blockchainStatus,
    signatory,
    blockchainStatusUuid,
    signatoryUuid,
    agenda,
    versionedBesluitenLijst,
    versionedNotulen,
    versionedBehandeling,
    agendaUuid,
    versionedBesluitenLijstUuid,
    versionedNotulenUuid,
    versionedBehandelingUuid,
  }) {
    return new SignedResource({
      uri: uri.value,
      uuid: uuid.value,
      html: html?.value,
      file: file?.value,
      hashValue: hashValue.value,
      hashAlgorithm: hashAlgorithm.value,
      created: created.value,
      signatoryRole: signatoryRole.value,
      deleted: deleted?.value,
      blockchainStatus: blockchainStatus.value,
      signatory: signatory.value,
      blockchainStatusUuid: blockchainStatusUuid.value,
      signatoryUuid: signatoryUuid.value,
      agenda: agenda?.value,
      versionedBesluitenLijst: versionedBesluitenLijst?.value,
      versionedNotulen: versionedNotulen?.value,
      versionedBehandeling: versionedBehandeling?.value,
      agendaUuid: agendaUuid?.value,
      versionedBesluitenLijstUuid: versionedBesluitenLijstUuid?.value,
      versionedNotulenUuid: versionedNotulenUuid?.value,
      versionedBehandelingUuid: versionedBehandelingUuid?.value,
    });
  }

  constructor({
    uri,
    uuid,
    html,
    file,
    hashValue,
    hashAlgorithm,
    created,
    signatoryRole,
    deleted,
    blockchainStatus,
    signatory,
    blockchainStatusUuid,
    signatoryUuid,
    agenda,
    versionedBesluitenLijst,
    versionedNotulen,
    versionedBehandeling,
    agendaUuid,
    versionedBesluitenLijstUuid,
    versionedNotulenUuid,
    versionedBehandelingUuid,
  }) {
    this.uuid = uuid;
    this.uri = uri;
    this.html = html;
    this.file = file;
    this.signatory = signatory;
    this.created = created;
    this.signatoryRole = signatoryRole;
    this.hashAlgorithm = hashAlgorithm;
    this.hashValue = hashValue;
    this.deleted = deleted;
    this.blockchainStatus = blockchainStatus;
    this.blockchainStatusUuid = blockchainStatusUuid;
    this.signatoryUuid = signatoryUuid;
    this.agenda = agenda;
    this.versionedBesluitenLijst = versionedBesluitenLijst;
    this.versionedNotulen = versionedNotulen;
    this.versionedBehandeling = versionedBehandeling;
    this.agendaUuid = agendaUuid;
    this.versionedBesluitenLijstUuid = versionedBesluitenLijstUuid;
    this.versionedNotulenUuid = versionedNotulenUuid;
    this.versionedBehandelingUuid = versionedBehandelingUuid;
  }

  /**
   * Convert into a json-api compliant model according to the mu-cl-resource config
   */
  toMuResourceModel() {
    // required relationships
    const relationships = {
      'blockchain-status': {
        data: {
          type: 'blockchain-statuses',
          id: this.blockchainStatusUuid,
        },
      },
      gebruiker: {
        data: { type: 'gebruikers', id: this.signatoryUuid },
      },
    };
    // optional relationships
    if (this.agendaUuid) {
      relationships.agenda = {
        data: {
          type: 'agendas',
          id: this.agendaUuid,
        },
      };
    }
    if (this.versionedBesluitenLijstUuid) {
      relationships['versioned-besluiten-lijst'] = {
        data: {
          type: 'versioned-besluiten-lijsten',
          id: this.versionedBesluitenLijstUuid,
        },
      };
    }
    if (this.versionedNotulenUuid) {
      relationships['versioned-notulen'] = {
        data: {
          type: 'versioned-notulen',
          id: this.versionedNotulenUuid,
        },
      };
    }
    if (this.versionedBehandelingUuid) {
      relationships['versioned-behandeling'] = {
        data: {
          type: 'versioned-behandelingen',
          id: this.versionedBehandelingUuid,
        },
      };
    }
    return {
      data: {
        id: this.uuid,
        type: 'signed-resources',
        attributes: {
          uri: this.uri,
          content: this.html,
          file: this.file,
          'hash-value': this.hashValue,
          'created-on': this.created,
          deleted: this.deleted,
        },
        relationships,
        links: {
          self: '/signed-resources/' + this.uuid,
        },
      },
    };
  }
}
