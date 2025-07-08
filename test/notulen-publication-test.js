// @ts-nocheck
// @ts-strict-ignore

import factory from '@rdfjs/dataset';
import { strict as assert } from 'assert';
import { before } from 'mocha';
import SHACLValidator from 'rdf-validate-shacl';
import AgendaPoint from '../models/agendapoint.js';
import Intermission from '../models/intermission.js';
import Meeting from '../models/meeting.js';
import Treatment from '../models/treatment.js';
import Attachment from '../models/attachment.js';
import { constructHtmlForMeetingNotesFromData } from '../support/notulen-utils.js';
import { prefixes } from '../support/prefixes.js';
import { setupHandleBars } from '../support/setup-handlebars.js';
import { htmlToRdf, loadDataset, shaclReportToMessage } from './helpers.js';
import { appendAttachmentsToDocument } from '../support/editor-document.js';
import { IS_FINAL } from '../support/constants.js';
import path from 'path';
import { Validator } from 'shacl-engine';

const person1 = {
  uri: 'http://my-example.org/mandatee/1',
  personUri: 'http://my-example.org/person/1',
  name: 'Freddy',
  familyName: 'Mercury',
  role: 'a role',
  roleUri: 'http://my-example.org/role/1',
  positionUri: 'http://my-example.org/position/1',
};

const person2 = {
  uri: 'http://my-example.org/mandatee/2',
  personUri: 'http://my-example.org/person/2',
  name: 'Nikki',
  familyName: 'Sixx',
  role: 'a role',
  roleUri: 'http://my-example.org/role/1',
  positionUri: 'http://my-example.org/position/1',
};

const person3 = {
  uri: 'http://my-example.org/mandatee/3',
  personUri: 'http://my-example.org/person/3',
  name: 'Till',
  familyName: 'Lindemann',
  role: 'a role',
  roleUri: 'http://my-example.org/role/1',
  positionUri: 'http://my-example.org/position/1',
};

const person4 = {
  uri: 'http://my-example.org/mandatee/1',
  personUri: 'http://my-example.org/person/1',
  name: 'Marilyin',
  familyName: 'Manson',
  role: 'a role',
  roleUri: 'http://my-example.org/role/1',
  positionUri: 'http://my-example.org/position/1',
};
const meeting = new Meeting({
  uuid: 'uuid',
  uri: 'http://my-example.org/meeting/uuid',
  plannedStart: '2021-05-01T15:00:00Z',
  startedAt: '2021-05-01T15:00:00Z',
  endedAt: '2021-05-01T18:00:00Z',
  adminBodyUri: 'http://my-example.org/bestuursorgaan/uuid',
  adminBodyName: 'bestuursorgaan',
});

const stemming = {
  type: 'standardVote',
  uri: 'http://my-example.org/stemming/1',
  isSecret: false,
  positiveVotes: 1,
  negativeVotes: 1,
  abstentionVotes: 0,
  subject: 'voting subject',
  result: 'voting result',
  whoVotesPhrase: 'De burgemeester stemt',
  attendees: [person1, person2],
  voters: [person1, person2],
  positiveVoters: [person1],
  negativeVoters: [person2],
  abstentionVoters: [],
};

const agendapoint1 = new AgendaPoint({
  uri: 'http://my-example.org/agendapoints/1234',
  title: 'agendapoint 1',
  plannedPublic: true,
  type: 'http://my-example.org/agendapoint-type/1',
  typeName: 'gepland',
  position: 1,
});

const agendapoint2 = new AgendaPoint({
  uri: 'http://my-example.org/agendapoints/1235',
  title: 'agendapoint 2',
  plannedPublic: true,
  type: 'http://my-example.org/agendapoint-type/1',
  typeName: 'gepland',
  description: 'a description for agendapoint 2',
  position: 2,
});

const agendapoints = [agendapoint1, agendapoint2];

const attachment1 = new Attachment({
  uri: 'http://my-example.org/attachment/1',
  decision: 'http://my-example.org/besluit/1',
  file: 'http://my-example.org/file/1',
  type: 'http://lblod.data.gift/concepts/14e264b4-92db-483f-9dd1-3e806ad6d26c',
  filename: 'file',
  fileUuid: '1',
});

const attachment2 = new Attachment({
  uri: 'http://my-example.org/attachment/2',
  decision: 'http://my-example.org/besluit/1',
  file: 'http://my-example.org/file/2',
  type: '',
  filename: 'file',
  fileUuid: '2',
});

const treatmentData1 = {
  treatment: new Treatment({
    uri: 'http://my-example.org/behandeling/1',
    isPublic: true,
    uuid: 1,
    agendapoint: agendapoint1.uri,
    position: agendapoint1.position,
    meeting: meeting.uri,
    editorDocumentUuid: null,
  }),
  agendapoint: agendapoint1,
  meeting: meeting,
  prefixes,
  participationList: {
    present: [person1, person2],
  },
  articleNumber: Number(agendapoint1.position) + 1,
  attachments: [attachment1],
  votes: [stemming],
  content: `<div class="say-editable say-block-rdfa" data-label="Besluit" about="http://my-example.org/besluit/1">
  <div style="display: none" class="say-hidden" data-rdfa-container="true"><span about="http://my-example.org/besluit/1" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://data.vlaanderen.be/ns/besluit#Besluit"></span><span about="http://my-example.org/besluit/1" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://mu.semte.ch/vocabularies/ext/BesluitNieuweStijl"></span><span about="http://my-example.org/besluit/1" property="http://data.europa.eu/eli/ontology#language" resource="http://publications.europa.eu/resource/authority/language/NLD"></span><span about="http://my-example.org/besluit/1" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="https://data.vlaanderen.be/id/concept/BesluitType/e96ec8af-6480-4b32-876a-fefe5f0a3793"></span><span rev="http://www.w3.org/ns/prov#generated" resource="http://my-example.org/behandeling/1"></span></div>
  <div data-content-container="true">
     <div class="say-editable say-block-rdfa" data-label="Openbare titel besluit" about="http://my-example.org/besluit/1" property="http://data.europa.eu/eli/ontology#title" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <h4 data-indentation-level="0" style="" level="4" indentationlevel="0" alignment="left" class="say-heading"><span class="mark-highlight-manual say-placeholder" placeholdertext="Geef titel besluit op" contenteditable="false">Geef titel besluit op</span></h4>
        </div>
     </div>
     <div class="say-editable say-block-rdfa" data-label="Korte openbare beschrijving" about="http://my-example.org/besluit/1" property="http://data.europa.eu/eli/ontology#description" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Geef korte beschrijving op" contenteditable="false">Geef korte beschrijving op</span></p>
        </div>
     </div>
     <div class="say-editable say-block-rdfa" data-label="Motivering" about="http://my-example.org/besluit/1" property="http://data.vlaanderen.be/ns/besluit#motivering" lang="nl" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="geef bestuursorgaan op" contenteditable="false">geef bestuursorgaan op</span>,</p>
           <p class="say-paragraph"><br class="say-hard-break"></p>
           <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Bevoegdheid</h5>
           <ul style="unordered" hierarchical="false" class="say-bullet-list">
              <li class="say-list-item" data-list-marker="1. ">
                 <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Rechtsgrond die bepaalt dat dit orgaan bevoegd is." contenteditable="false">Rechtsgrond die bepaalt dat dit orgaan bevoegd is.</span></p>
              </li>
           </ul>
           <p class="say-paragraph"><br class="say-hard-break"></p>
           <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Juridische context</h5>
           <ul style="unordered" hierarchical="false" class="say-bullet-list">
              <li class="say-list-item" data-list-marker="1. ">
                 <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Voeg juridische context in" contenteditable="false">Voeg juridische context in</span></p>
              </li>
           </ul>
           <p class="say-paragraph"><br class="say-hard-break"></p>
           <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Feitelijke context en argumentatie</h5>
           <ul style="unordered" hierarchical="false" class="say-bullet-list">
              <li class="say-list-item" data-list-marker="1. ">
                 <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Voeg context en argumentatie in" contenteditable="false">Voeg context en argumentatie in</span></p>
              </li>
           </ul>
        </div>
     </div>
     <p class="say-paragraph"><br class="say-hard-break"><br class="say-hard-break"></p>
     <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Beslissing</h5>
     <div class="say-editable say-block-rdfa" data-label="Artikels" about="http://my-example.org/besluit/1" property="http://www.w3.org/ns/prov#value" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <div data-say-render-as="structure" data-say-has-title="false" data-say-structure-type="article" data-say-header-format="name" data-say-header-tag="h5" data-say-number="1" data-say-romanize="false" data-say-is-only-article="true" about="http://data.lblod.info/artikels/--ref-uuid4-7a0552ff-4fb1-4e42-98d6-dd88faf60f0c" property="http://www.w3.org/ns/prov#value" datatype="http://www.w3.org/2001/XMLSchema#string" lang="">
              <div style="display: none" class="say-hidden" data-rdfa-container="true"><span about="http://data.lblod.info/artikels/--ref-uuid4-7a0552ff-4fb1-4e42-98d6-dd88faf60f0c" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://data.vlaanderen.be/ns/besluit#Artikel"></span><span rev="http://data.europa.eu/eli/ontology#has_part" resource="http://my-example.org/besluit/1"></span></div>
              <div data-content-container="true">
                 <div>
                    <h5><span data-say-structure-header-name="true">Enig artikel </span><span style="display: none;" data-say-structure-header-number="true" property="http://data.europa.eu/eli/ontology#number" datatype="http://www.w3.org/2001/XMLSchema#string">1</span></h5>
                    <div property="https://say.data.gift/ns/body" datatype="http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral">
                       <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Voer inhoud in" contenteditable="false">Voer inhoud in</span></p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
     </div>
  </div>
</div>`,
};

const treatmentData2 = {
  treatment: new Treatment({
    uri: 'http://my-example.org/behandeling/2',
    isPublic: true,
    uuid: 2,
    agendapoint: agendapoint2.uri,
    position: agendapoint2.position,
    meeting: meeting.uri,
    editorDocumentUuid: null,
  }),
  agendapoint: agendapoint2,
  meeting: meeting,
  prefixes,
  articleNumber: Number(agendapoint2.position) + 1,
  content: `<div class="say-editable say-block-rdfa" data-label="Besluit" about="http://my-example.org/besluit/2">
  <div style="display: none" class="say-hidden" data-rdfa-container="true"><span about="http://my-example.org/besluit/2" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://data.vlaanderen.be/ns/besluit#Besluit"></span><span about="http://my-example.org/besluit/2" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://mu.semte.ch/vocabularies/ext/BesluitNieuweStijl"></span><span about="http://my-example.org/besluit/2" property="http://data.europa.eu/eli/ontology#language" resource="http://publications.europa.eu/resource/authority/language/NLD"></span><span about="http://my-example.org/besluit/2" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="https://data.vlaanderen.be/id/concept/BesluitType/e96ec8af-6480-4b32-876a-fefe5f0a3793"></span><span rev="http://www.w3.org/ns/prov#generated" resource="http://my-example.org/behandeling/2"></span></div>
  <div data-content-container="true">
     <div class="say-editable say-block-rdfa" data-label="Openbare titel besluit" about="http://my-example.org/besluit/2" property="http://data.europa.eu/eli/ontology#title" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <h4 data-indentation-level="0" style="" level="4" indentationlevel="0" alignment="left" class="say-heading"><span class="mark-highlight-manual say-placeholder" placeholdertext="Geef titel besluit op" contenteditable="false">Geef titel besluit op</span></h4>
        </div>
     </div>
     <div class="say-editable say-block-rdfa" data-label="Korte openbare beschrijving" about="http://my-example.org/besluit/2" property="http://data.europa.eu/eli/ontology#description" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Geef korte beschrijving op" contenteditable="false">Geef korte beschrijving op</span></p>
        </div>
     </div>
     <div class="say-editable say-block-rdfa" data-label="Motivering" about="http://my-example.org/besluit/2" property="http://data.vlaanderen.be/ns/besluit#motivering" lang="nl" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="geef bestuursorgaan op" contenteditable="false">geef bestuursorgaan op</span>,</p>
           <p class="say-paragraph"><br class="say-hard-break"></p>
           <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Bevoegdheid</h5>
           <ul style="unordered" hierarchical="false" class="say-bullet-list">
              <li class="say-list-item" data-list-marker="1. ">
                 <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Rechtsgrond die bepaalt dat dit orgaan bevoegd is." contenteditable="false">Rechtsgrond die bepaalt dat dit orgaan bevoegd is.</span></p>
              </li>
           </ul>
           <p class="say-paragraph"><br class="say-hard-break"></p>
           <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Juridische context</h5>
           <ul style="unordered" hierarchical="false" class="say-bullet-list">
              <li class="say-list-item" data-list-marker="1. ">
                 <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Voeg juridische context in" contenteditable="false">Voeg juridische context in</span></p>
              </li>
           </ul>
           <p class="say-paragraph"><br class="say-hard-break"></p>
           <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Feitelijke context en argumentatie</h5>
           <ul style="unordered" hierarchical="false" class="say-bullet-list">
              <li class="say-list-item" data-list-marker="1. ">
                 <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Voeg context en argumentatie in" contenteditable="false">Voeg context en argumentatie in</span></p>
              </li>
           </ul>
        </div>
     </div>
     <p class="say-paragraph"><br class="say-hard-break"><br class="say-hard-break"></p>
     <h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left" class="say-heading">Beslissing</h5>
     <div class="say-editable say-block-rdfa" data-label="Artikels" about="http://my-example.org/besluit/2" property="http://www.w3.org/ns/prov#value" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true">
        <div style="display: none" class="say-hidden" data-rdfa-container="true"></div>
        <div data-content-container="true">
           <div data-say-render-as="structure" data-say-has-title="false" data-say-structure-type="article" data-say-header-format="name" data-say-header-tag="h5" data-say-number="1" data-say-romanize="false" data-say-is-only-article="true" about="http://data.lblod.info/artikels/--ref-uuid4-7a0552ff-4fb1-4e42-98d6-dd88faf60f0c" property="http://www.w3.org/ns/prov#value" datatype="http://www.w3.org/2001/XMLSchema#string" lang="">
              <div style="display: none" class="say-hidden" data-rdfa-container="true"><span about="http://data.lblod.info/artikels/--ref-uuid4-7a0552ff-4fb1-4e42-98d6-dd88faf60f0c" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://data.vlaanderen.be/ns/besluit#Artikel"></span><span rev="http://data.europa.eu/eli/ontology#has_part" resource="http://my-example.org/besluit/2"></span></div>
              <div data-content-container="true">
                 <div>
                    <h5><span data-say-structure-header-name="true">Enig artikel </span><span style="display: none;" data-say-structure-header-number="true" property="http://data.europa.eu/eli/ontology#number" datatype="http://www.w3.org/2001/XMLSchema#string">1</span></h5>
                    <div property="https://say.data.gift/ns/body" datatype="http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral">
                       <p class="say-paragraph"><span class="mark-highlight-manual say-placeholder" placeholdertext="Voer inhoud in" contenteditable="false">Voer inhoud in</span></p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
     </div>
  </div>
</div>`,
};

const intermission = new Intermission({
  uri: 'http://my-example.org/intermissions/1',
  startedAt: '2021-05-01T15:00:00Z',
  endedAt: '2021-05-01T18:00:00Z',
  comment: 'this is the comment',
});

const participationList = {
  present: [person1],
  notPresent: [person2],
  chairman: person3,
  secretary: person4,
};

function constructNotulen() {
  const html = constructHtmlForMeetingNotesFromData({
    meeting,
    agendapoints,
    treatmentsData: [treatmentData1, treatmentData2],
    intermissions: [intermission],
    participationList,
  });
  return html;
}

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

describe('notulen publication template', function () {
  before(async function () {
    setupHandleBars();
    const html = `<div property="besluit:heeftNotulen" typeof="foaf:document" resource="http://data.lblod.info/id/lblod/notulen/8479d0f3b28f19894254aaea63fdda613ce27f8d1e975ddf2ffd84ef020b64f9">

      <p class="au-c-heading au-c-heading--5">
        Datum publicatie:
          <span property="prov:wasDerivedFrom" resource="http://data.lblod.info/published-resources/227736a0-1e80-11ef-8fd5-439ead64bd6d" typeof="sign:PublishedResource">
              <span property="eli:date_publication" datatype="xsd:date" content="2024-05-30">
                30 mei 2024
              </span>

          </span>
      </p>
      <div property="prov:value"><div class="au-c-template au-c-template--notes notulen" prefix="eli: http://data.europa.eu/eli/ontology# prov: http://www.w3.org/ns/prov# mandaat: http://data.vlaanderen.be/ns/mandaat# besluit: http://data.vlaanderen.be/ns/besluit# ext: http://mu.semte.ch/vocabularies/ext/ person: http://www.w3.org/ns/person# persoon: http://data.vlaanderen.be/ns/persoon# dateplugin: http://say.data.gift/manipulators/insertion/ besluittype: https://data.vlaanderen.be/id/concept/BesluitType/ dct: http://purl.org/dc/terms/ mobiliteit: https://data.vlaanderen.be/ns/mobiliteit# lblodmow: http://data.lblod.info/vocabularies/mobiliteit/">
  <div resource="http://data.lblod.info/id/zittingen/66586FD1261BFA3B99636824" typeof="besluit:Zitting">
    <h1 property="dc:title">
      Notulen van de
      <span property="http://data.vlaanderen.be/ns/besluit#isGehoudenDoor" typeof="http://data.vlaanderen.be/ns/besluit#Bestuursorgaan" resource="http://data.lblod.info/id/bestuursorganen/5f05da0d28da533e97b64043caa9c30e325123a6be45a832de86e8f05ff7e1db">
        Gemeenteraad Aalst,
      </span> van
      <span content="2024-05-30T12:23:35.398Z" datatype="xsd:dateTime" property="prov:startedAtTime" class="is-required">
        30/05/2024 14:23
      </span>
    </h1>
    <p>
      Geplande start:
      <span content="2024-05-30T12:23:35.398Z" datatype="xsd:dateTime" property="besluit:geplandeStart" class="is-required">
        30/05/2024 14:23
      </span>
    </p>
      <p>
        Locatie:
        <span property="prov:atLocation">my location</span>
      </p>
            <div class="au-c-template-list-container">
              <p>
                <strong>Aanwezige leden</strong>
              </p>
              <ul class="au-c-template-list-inline">
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC86657753A0009000252" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/f202051a-f5c0-4aa4-8b6b-7980a8239ed5" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Ingmar">Ingmar</span>
                      <span property="foaf:familyName" content="Baeyens">Baeyens </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB38FDA3ACB60008000925" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/55e684ff368fb1434c5d0923efac0fdffb84d67c4a9b2c8bb24064f0bd3d57b3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Katrien">Katrien</span>
                      <span property="foaf:familyName" content="Beulens">Beulens </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC78257753A0009000247" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/fc1d01ab-1b3c-491b-9080-23e7147002a6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                      <span property="foaf:familyName" content="Blanckaert">Blanckaert </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3D257753A0009000218" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/0b197d19320ac3cd4f36caaa1b8027dddbeda9968ecbf7c17295292c385b1724" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Maarten">Maarten</span>
                      <span property="foaf:familyName" content="Blommaert">Blommaert </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5E9FF933A3ACB6000800016A" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/fe005c2b1f3b7c4895a184876600c6535249ef706d22a424b907b787d7a8a4d0" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Pieter">Pieter</span>
                      <span property="foaf:familyName" content="Cassiman">Cassiman </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC7A757753A0009000249" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/0d6c7612-24bc-4ea1-af50-f86fa519a421" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Guy">Guy</span>
                      <span property="foaf:familyName" content="Claus">Claus </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5F3CC5D1F9D30200080001F0" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/daa639812c66ae23788a630022c95cb09268c721c3d88a2ee4f7271d253c822c" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="David">David</span>
                      <span property="foaf:familyName" content="Coppens">Coppens </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC53A57753A000900022A" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/910a001529fc4066dd8937e22d20140daafad01a5225995b2a464115d58db4e9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Eddy">Eddy</span>
                      <span property="foaf:familyName" content="Couckuyt">Couckuyt </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DCA2D57753A0009000268" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/ac7c0cec477cc285a64e2ab49dbf472d72552c43caf849a827ac7766b9894282" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Christoph">Christoph</span>
                      <span property="foaf:familyName" content="D'Haese">D'Haese </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61C2F033E4465300080002C1" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/c50701f5-cc87-4a17-80a7-70c8c234623b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                      <span property="foaf:familyName" content="De" bruecker="">De Bruecker </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC5AE57753A0009000234" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/acedf4067acac7837a1089ec6cdc38a79c8efb569493dd8bbbd7af70d8fb5640" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Martine">Martine</span>
                      <span property="foaf:familyName" content="De" maght="">De Maght </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC27057753A0009000208" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/6c4dc6f7b1bc51eb4084d84481f0bc93c7778145fd256ad62ead25f426499d0d" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Caroline">Caroline</span>
                      <span property="foaf:familyName" content="De" meerleer="">De Meerleer </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC22257753A0009000200" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/86be64623362a49c6abcb2d4e49be9366cf248a6819584adb7bc316368f683ab" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Matthias">Matthias</span>
                      <span property="foaf:familyName" content="De" ridder="">De Ridder </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3F957753A000900021A" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/5ce3d2e41eb9407c725b321d0c196abaf3b80fd22f1aa5430f3027cbf7d2fca9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Yasmine">Yasmine</span>
                      <span property="foaf:familyName" content="Deghels">Deghels </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC38157753A0009000214" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/b3231202-18db-4388-bcd9-94d657599aff" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Vincent">Vincent</span>
                      <span property="foaf:familyName" content="Delforge">Delforge </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC30157753A000900020E" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/560124f5661616d251b8d88ddeff2eea1e4e08a5a94603485ce6e4f0e2cb60bf" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Karolien">Karolien</span>
                      <span property="foaf:familyName" content="Devos">Devos </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5FF2E42478A81C0009000A55" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/4fe32472-3bbc-4d28-bc55-c70770adf276" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Marc">Marc</span>
                      <span property="foaf:familyName" content="Dierickx">Dierickx </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC97757753A0009000261" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/5458f33b694e66069365bdcd5790b2265ccd15e7095670fba3e4d5c5187b1730" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Cathy">Cathy</span>
                      <span property="foaf:familyName" content="Grysolle">Grysolle </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC70F57753A000900023F" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/d14aaeb0622a9b5855cc22d71124193cd9020b586ecfa0a8f5e88a2fa411d7a4" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Steve">Steve</span>
                      <span property="foaf:familyName" content="Herman">Herman </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/635A80B944D3E2E4388C8417" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/5cf2168f-b242-400e-82b7-fa78d11acf2a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Maxine">Maxine</span>
                      <span property="foaf:familyName" content="Mc" kenzie="">Mc Kenzie </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/650AAF6916D6388FC956BCAC" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/f2a49e2b-ed1b-4fec-ba37-c41e7d2c095a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                      <span property="foaf:familyName" content="Moraleda-Barona">Moraleda-Barona </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC4E857753A0009000226" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/60ef8d59dad103083f5585e3ae401f9af80f59011c3e4535aff3e068d0e69ba6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Theo">Theo</span>
                      <span property="foaf:familyName" content="Nsengimana">Nsengimana </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC2DB57753A000900020C" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/ad809d705a2a9450a9f5d4196f628e57660a5b23844d77e5c7929e0c1669182b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Iwein">Iwein</span>
                      <span property="foaf:familyName" content="Quintelier">Quintelier </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC35657753A0009000212" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/a0a53cc4-e4ea-4fbc-8e6e-6be96bc23298" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                      <span property="foaf:familyName" content="Sidorski">Sidorski </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBF6657753A00090001ED" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/757d15975fdbbb28147146e84778554682d2446682428233b7a13c900364b81b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                      <span property="foaf:familyName" content="Smeyers">Smeyers </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DF1F5B9A3ACB60008000014" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/ed97834da3e17151699c41c2eeaccc0c9473dca64209f0608660937632be9ea7" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Michel">Michel</span>
                      <span property="foaf:familyName" content="Van" brempt="">Van Brempt </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61790DF1890F3E0008000053" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/e4b9c71b-50c7-488b-baa4-bba423a1dda3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Filip">Filip</span>
                      <span property="foaf:familyName" content="Van" de="" winkel="">Van De Winkel </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC73457753A0009000242" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/eed3550929ccf5097bc125693b2d1c1ea62bac378534a86ced36c9b950793e30" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Johan">Johan</span>
                      <span property="foaf:familyName" content="Van" nieuwenhove="">Van Nieuwenhove </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBFDD57753A00090001EF" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/175368c1621d70b7e18a65527b72d7069320fd3f3a0322b6ab7e167dd31a8d03" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Karim">Karim</span>
                      <span property="foaf:familyName" content="Van" overmeire="">Van Overmeire </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC75B57753A0009000244" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/eecf6879-f873-4b01-9b69-8270c15a8083" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Els">Els</span>
                      <span property="foaf:familyName" content="Van" puyvelde="">Van Puyvelde </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC32D57753A0009000210" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/00a3eb8d34547251de033ce21f5f52395ad1c377c10d5774f4d279d625ef69e8" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Kris">Kris</span>
                      <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB3AA4A3ACB60008000934" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/16f03b09a9766484909a87c46b524f1165d6bd3b79650cec0c0c27fb4352d46e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Silke">Silke</span>
                      <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6058904D9006E90008000027" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/db35d79036a5ea82fe41e2a90ed2dc8c5327ea7c1033e47be0ea418103241a82" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Sam">Sam</span>
                      <span property="foaf:familyName" content="Van" de="" putte="">Van de Putte </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC94F57753A000900025E" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/7e3f6d69eed2db8d2d49344aac162cb0151e041a7ef4696ff2d9a214d4dd6a85" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Ann">Ann</span>
                      <span property="foaf:familyName" content="Van" de="" steen="">Van de Steen </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC66457753A0009000238" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/57e4f501c0ca4205422cbadf61de7ef1d4b0b84ba897647aa84acd02ac3a46ef" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Bart">Bart</span>
                      <span property="foaf:familyName" content="Van" den="" neste="">Van den Neste </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6244235D77B95A00080001F8" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/829cde9c-2706-4b27-a81b-277915309bb9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Dirk">Dirk</span>
                      <span property="foaf:familyName" content="Verleysen">Verleysen </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC81257753A000900024D" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/3c510b492c9894e967e7744d2e3bea670cfcb05412e65b725173fefcc550e273" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Lander">Lander</span>
                      <span property="foaf:familyName" content="Wantens">Wantens </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/605890C59006E9000800002D" property="besluit:heeftAanwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/4491c016-b19a-469c-ad8e-c725be535e59" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Deniz">Deniz</span>
                      <span property="foaf:familyName" content="Özkan">Özkan </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
              </ul>
            </div>
            <div class="au-c-template-list-container">
              <p>
                <strong>Afwezige leden</strong>
              </p>
              <ul class="au-c-template-list-inline">
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC6D357753A000900023D" property="ext:heeftAfwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/14b3c386f69ecba7c2623b9ccf9255e79f95ab4ba6c6f6b35624a9c0aba81e3e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                      <span property="foaf:familyName" content="De" gols="">De Gols </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6656DEE879A0F1636172CD05" property="ext:heeftAfwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/14b3c386f69ecba7c2623b9ccf9255e79f95ab4ba6c6f6b35624a9c0aba81e3e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                      <span property="foaf:familyName" content="De" gols="">De Gols </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
                  <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC56757753A000900022C" property="ext:heeftAfwezigeBijStart">
                    <span resource="http://data.lblod.info/id/personen/f08c3cbae86fcbac647520008b684b6b24d3f89b8c2e2bf0dd05157c13f7c01b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                      <span property="persoon:gebruikteVoornaam" content="Jean-Jacques">Jean-Jacques</span>
                      <span property="foaf:familyName" content="De" gucht="">De Gucht </span>
                    </span>
                      (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                  </li>
              </ul>
            </div>
    <h2>
      De voorzitter opent de zitting op
      <span content="2024-05-30T12:23:35.398Z" datatype="xsd:dateTime" property="prov:startedAtTime">
        30/05/2024 14:23
      </span>.
    </h2>
      <p>
        </p><div lang="nl-BE" data-say-document="true"><p>Free text</p></div>
      <p></p>
    <h2>Agenda overzicht</h2>
    <ul class="au-c-template-list">
        <li class="au-c-template-list__item" typeof="besluit:Agendapunt" resource="http://data.lblod.info/id/agendapunten/66587013261BFA3B99636828" property="besluit:behandelt">
          <span property="dc:subject">Agendapunt</span>
          -
          <span content="true" datatype="xsd:boolean" property="besluit:geplandOpenbaar">
              <span class="au-c-template-public">Gepland openbaar</span>
          </span>
          <h3>1. <span datatype="xsd:string" property="dc:title">FIrst agendapoint</span></h3>
          <p datatype="xsd:string" property="dc:description">FIrst agendapoint description</p>
        </li>
    </ul>

    <h2>Behandeling van de Agendapunten</h2>
    <div class="c-template-content" property="http://mu.semte.ch/vocabularies/ext/behandelingVanAgendapuntenContainer">
        <div class="au-c-template au-c-template--treatment" typeof="besluit:BehandelingVanAgendapunt" resource="http://data.lblod.info/id/behandelingen-van-agendapunten/66587013261BFA3B99636827">
          <p content="true" datatype="xsd:boolean" property="besluit:openbaar">
              <span class="au-c-template-public">Openbare behandeling van agendapunt</span>
          </p>
          <h3 resource="http://data.lblod.info/id/agendapunten/66587013261BFA3B99636828" property="dc:subject">
            <span property="dc:title">FIrst agendapoint</span>
          </h3>
            <h4>Aanwezigen bij agendapunt</h4>
            <div class="c-template-content c-template-content--present" property="ext:aanwezigenTable">
                    <div class="au-c-template-list-container">
                      <p>
                        <strong>Aanwezige leden</strong>
                      </p>
                      <ul class="au-c-template-list-inline">
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC86657753A0009000252" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/f202051a-f5c0-4aa4-8b6b-7980a8239ed5" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Ingmar">Ingmar</span>
                              <span property="foaf:familyName" content="Baeyens">Baeyens </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB38FDA3ACB60008000925" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/55e684ff368fb1434c5d0923efac0fdffb84d67c4a9b2c8bb24064f0bd3d57b3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Katrien">Katrien</span>
                              <span property="foaf:familyName" content="Beulens">Beulens </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC78257753A0009000247" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/fc1d01ab-1b3c-491b-9080-23e7147002a6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                              <span property="foaf:familyName" content="Blanckaert">Blanckaert </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3D257753A0009000218" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/0b197d19320ac3cd4f36caaa1b8027dddbeda9968ecbf7c17295292c385b1724" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Maarten">Maarten</span>
                              <span property="foaf:familyName" content="Blommaert">Blommaert </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5E9FF933A3ACB6000800016A" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/fe005c2b1f3b7c4895a184876600c6535249ef706d22a424b907b787d7a8a4d0" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Pieter">Pieter</span>
                              <span property="foaf:familyName" content="Cassiman">Cassiman </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC7A757753A0009000249" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/0d6c7612-24bc-4ea1-af50-f86fa519a421" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Guy">Guy</span>
                              <span property="foaf:familyName" content="Claus">Claus </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5F3CC5D1F9D30200080001F0" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/daa639812c66ae23788a630022c95cb09268c721c3d88a2ee4f7271d253c822c" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="David">David</span>
                              <span property="foaf:familyName" content="Coppens">Coppens </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC53A57753A000900022A" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/910a001529fc4066dd8937e22d20140daafad01a5225995b2a464115d58db4e9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Eddy">Eddy</span>
                              <span property="foaf:familyName" content="Couckuyt">Couckuyt </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DCA2D57753A0009000268" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/ac7c0cec477cc285a64e2ab49dbf472d72552c43caf849a827ac7766b9894282" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Christoph">Christoph</span>
                              <span property="foaf:familyName" content="D'Haese">D'Haese </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61C2F033E4465300080002C1" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/c50701f5-cc87-4a17-80a7-70c8c234623b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                              <span property="foaf:familyName" content="De" bruecker="">De Bruecker </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC5AE57753A0009000234" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/acedf4067acac7837a1089ec6cdc38a79c8efb569493dd8bbbd7af70d8fb5640" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Martine">Martine</span>
                              <span property="foaf:familyName" content="De" maght="">De Maght </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC27057753A0009000208" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/6c4dc6f7b1bc51eb4084d84481f0bc93c7778145fd256ad62ead25f426499d0d" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Caroline">Caroline</span>
                              <span property="foaf:familyName" content="De" meerleer="">De Meerleer </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC22257753A0009000200" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/86be64623362a49c6abcb2d4e49be9366cf248a6819584adb7bc316368f683ab" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Matthias">Matthias</span>
                              <span property="foaf:familyName" content="De" ridder="">De Ridder </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3F957753A000900021A" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/5ce3d2e41eb9407c725b321d0c196abaf3b80fd22f1aa5430f3027cbf7d2fca9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Yasmine">Yasmine</span>
                              <span property="foaf:familyName" content="Deghels">Deghels </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC38157753A0009000214" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/b3231202-18db-4388-bcd9-94d657599aff" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Vincent">Vincent</span>
                              <span property="foaf:familyName" content="Delforge">Delforge </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC30157753A000900020E" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/560124f5661616d251b8d88ddeff2eea1e4e08a5a94603485ce6e4f0e2cb60bf" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Karolien">Karolien</span>
                              <span property="foaf:familyName" content="Devos">Devos </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5FF2E42478A81C0009000A55" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/4fe32472-3bbc-4d28-bc55-c70770adf276" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Marc">Marc</span>
                              <span property="foaf:familyName" content="Dierickx">Dierickx </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC97757753A0009000261" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/5458f33b694e66069365bdcd5790b2265ccd15e7095670fba3e4d5c5187b1730" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Cathy">Cathy</span>
                              <span property="foaf:familyName" content="Grysolle">Grysolle </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC70F57753A000900023F" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/d14aaeb0622a9b5855cc22d71124193cd9020b586ecfa0a8f5e88a2fa411d7a4" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Steve">Steve</span>
                              <span property="foaf:familyName" content="Herman">Herman </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/635A80B944D3E2E4388C8417" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/5cf2168f-b242-400e-82b7-fa78d11acf2a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Maxine">Maxine</span>
                              <span property="foaf:familyName" content="Mc" kenzie="">Mc Kenzie </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/650AAF6916D6388FC956BCAC" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/f2a49e2b-ed1b-4fec-ba37-c41e7d2c095a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                              <span property="foaf:familyName" content="Moraleda-Barona">Moraleda-Barona </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC4E857753A0009000226" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/60ef8d59dad103083f5585e3ae401f9af80f59011c3e4535aff3e068d0e69ba6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Theo">Theo</span>
                              <span property="foaf:familyName" content="Nsengimana">Nsengimana </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/605890C59006E9000800002D" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/4491c016-b19a-469c-ad8e-c725be535e59" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Deniz">Deniz</span>
                              <span property="foaf:familyName" content="Özkan">Özkan </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC2DB57753A000900020C" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/ad809d705a2a9450a9f5d4196f628e57660a5b23844d77e5c7929e0c1669182b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Iwein">Iwein</span>
                              <span property="foaf:familyName" content="Quintelier">Quintelier </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC35657753A0009000212" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/a0a53cc4-e4ea-4fbc-8e6e-6be96bc23298" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                              <span property="foaf:familyName" content="Sidorski">Sidorski </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBF6657753A00090001ED" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/757d15975fdbbb28147146e84778554682d2446682428233b7a13c900364b81b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                              <span property="foaf:familyName" content="Smeyers">Smeyers </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DF1F5B9A3ACB60008000014" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/ed97834da3e17151699c41c2eeaccc0c9473dca64209f0608660937632be9ea7" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Michel">Michel</span>
                              <span property="foaf:familyName" content="Van" brempt="">Van Brempt </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6058904D9006E90008000027" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/db35d79036a5ea82fe41e2a90ed2dc8c5327ea7c1033e47be0ea418103241a82" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Sam">Sam</span>
                              <span property="foaf:familyName" content="Van" de="" putte="">Van de Putte </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC94F57753A000900025E" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/7e3f6d69eed2db8d2d49344aac162cb0151e041a7ef4696ff2d9a214d4dd6a85" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Ann">Ann</span>
                              <span property="foaf:familyName" content="Van" de="" steen="">Van de Steen </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61790DF1890F3E0008000053" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/e4b9c71b-50c7-488b-baa4-bba423a1dda3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Filip">Filip</span>
                              <span property="foaf:familyName" content="Van" de="" winkel="">Van De Winkel </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC66457753A0009000238" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/57e4f501c0ca4205422cbadf61de7ef1d4b0b84ba897647aa84acd02ac3a46ef" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Bart">Bart</span>
                              <span property="foaf:familyName" content="Van" den="" neste="">Van den Neste </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC73457753A0009000242" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/eed3550929ccf5097bc125693b2d1c1ea62bac378534a86ced36c9b950793e30" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Johan">Johan</span>
                              <span property="foaf:familyName" content="Van" nieuwenhove="">Van Nieuwenhove </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBFDD57753A00090001EF" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/175368c1621d70b7e18a65527b72d7069320fd3f3a0322b6ab7e167dd31a8d03" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Karim">Karim</span>
                              <span property="foaf:familyName" content="Van" overmeire="">Van Overmeire </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC75B57753A0009000244" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/eecf6879-f873-4b01-9b69-8270c15a8083" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Els">Els</span>
                              <span property="foaf:familyName" content="Van" puyvelde="">Van Puyvelde </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC32D57753A0009000210" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/00a3eb8d34547251de033ce21f5f52395ad1c377c10d5774f4d279d625ef69e8" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Kris">Kris</span>
                              <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB3AA4A3ACB60008000934" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/16f03b09a9766484909a87c46b524f1165d6bd3b79650cec0c0c27fb4352d46e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Silke">Silke</span>
                              <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6244235D77B95A00080001F8" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/829cde9c-2706-4b27-a81b-277915309bb9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Dirk">Dirk</span>
                              <span property="foaf:familyName" content="Verleysen">Verleysen </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC81257753A000900024D" property="besluit:heeftAanwezige">
                            <span resource="http://data.lblod.info/id/personen/3c510b492c9894e967e7744d2e3bea670cfcb05412e65b725173fefcc550e273" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Lander">Lander</span>
                              <span property="foaf:familyName" content="Wantens">Wantens </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                      </ul>
                    </div>
                    <div class="au-c-template-list-container">
                      <p>
                        <strong>Afwezige leden</strong>
                      </p>
                      <ul class="au-c-template-list-inline">
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC6D357753A000900023D" property="ext:heeftAfwezige">
                            <span resource="http://data.lblod.info/id/personen/14b3c386f69ecba7c2623b9ccf9255e79f95ab4ba6c6f6b35624a9c0aba81e3e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                              <span property="foaf:familyName" content="De" gols="">De Gols </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6656DEE879A0F1636172CD05" property="ext:heeftAfwezige">
                            <span resource="http://data.lblod.info/id/personen/14b3c386f69ecba7c2623b9ccf9255e79f95ab4ba6c6f6b35624a9c0aba81e3e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                              <span property="foaf:familyName" content="De" gols="">De Gols </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                          <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC56757753A000900022C" property="ext:heeftAfwezige">
                            <span resource="http://data.lblod.info/id/personen/f08c3cbae86fcbac647520008b684b6b24d3f89b8c2e2bf0dd05157c13f7c01b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                              <span property="persoon:gebruikteVoornaam" content="Jean-Jacques">Jean-Jacques</span>
                              <span property="foaf:familyName" content="De" gucht="">De Gucht </span>
                            </span>
                              (<span property="org:holds" typeof="mandaat:Mandaat" resource="http://data.lblod.info/id/mandaten/f990dcf131e3c0647a7b3b48a6c3d0d516350023567145701824d2c59ce01741"><span property="org:role" typeof="skos:Concept" resource="http://data.vlaanderen.be/id/concept/BestuursfunctieCode/5ab0e9b8a3b2ca7c5e000011"><span property="skos:prefLabel" content="Gemeenteraadslid">Gemeenteraadslid</span></span></span>)
                          </li>
                      </ul>
                    </div>
                <p>
                  <strong>Voorzitter:</strong>
                  <span typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC86657753A0009000252" property="besluit:heeftVoorzitter">
                      <span resource="http://data.lblod.info/id/personen/f202051a-f5c0-4aa4-8b6b-7980a8239ed5" property="mandaat:isBestuurlijkeAliasVan">
                        <span property="persoon:gebruikteVoornaam">Ingmar</span>
                        <span property="foaf:familyName">Baeyens</span>
                      </span>
                    </span>
                </p>
            </div>
            <h4>Stemmingen bij agendapunt</h4>
            <div class="c-template-content c-template-content--voting" property="ext:stemmingTable">
              <div typeof="http://data.vlaanderen.be/ns/besluit#Stemming" resource="http://data.lblod.info/id/stemmingen/66587044261BFA3B99636829" property="besluit:heeftStemming">
                <p datatype="xsd:boolean" content="false" property="besluit:geheim">
                    De leden van de raad stemmen openbaar
                </p>
                <p lang="nl-BE" property="besluit:onderwerp">For the voting</p>
                      <div class="au-c-template-list-container">
                        <p>
                          <strong>Aanwezigen tijdens de stemming</strong>
                        </p>
                        <ul class="au-c-template-list-inline">
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC86657753A0009000252" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/f202051a-f5c0-4aa4-8b6b-7980a8239ed5" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Ingmar">Ingmar</span>
                                <span property="foaf:familyName" content="Baeyens">Baeyens </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB38FDA3ACB60008000925" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/55e684ff368fb1434c5d0923efac0fdffb84d67c4a9b2c8bb24064f0bd3d57b3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Katrien">Katrien</span>
                                <span property="foaf:familyName" content="Beulens">Beulens </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC78257753A0009000247" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/fc1d01ab-1b3c-491b-9080-23e7147002a6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                                <span property="foaf:familyName" content="Blanckaert">Blanckaert </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3D257753A0009000218" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/0b197d19320ac3cd4f36caaa1b8027dddbeda9968ecbf7c17295292c385b1724" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Maarten">Maarten</span>
                                <span property="foaf:familyName" content="Blommaert">Blommaert </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5E9FF933A3ACB6000800016A" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/fe005c2b1f3b7c4895a184876600c6535249ef706d22a424b907b787d7a8a4d0" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Pieter">Pieter</span>
                                <span property="foaf:familyName" content="Cassiman">Cassiman </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC7A757753A0009000249" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/0d6c7612-24bc-4ea1-af50-f86fa519a421" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Guy">Guy</span>
                                <span property="foaf:familyName" content="Claus">Claus </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5F3CC5D1F9D30200080001F0" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/daa639812c66ae23788a630022c95cb09268c721c3d88a2ee4f7271d253c822c" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="David">David</span>
                                <span property="foaf:familyName" content="Coppens">Coppens </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC53A57753A000900022A" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/910a001529fc4066dd8937e22d20140daafad01a5225995b2a464115d58db4e9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Eddy">Eddy</span>
                                <span property="foaf:familyName" content="Couckuyt">Couckuyt </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DCA2D57753A0009000268" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/ac7c0cec477cc285a64e2ab49dbf472d72552c43caf849a827ac7766b9894282" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Christoph">Christoph</span>
                                <span property="foaf:familyName" content="D'Haese">D'Haese </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61C2F033E4465300080002C1" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/c50701f5-cc87-4a17-80a7-70c8c234623b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                                <span property="foaf:familyName" content="De" bruecker="">De Bruecker </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC5AE57753A0009000234" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/acedf4067acac7837a1089ec6cdc38a79c8efb569493dd8bbbd7af70d8fb5640" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Martine">Martine</span>
                                <span property="foaf:familyName" content="De" maght="">De Maght </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC27057753A0009000208" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/6c4dc6f7b1bc51eb4084d84481f0bc93c7778145fd256ad62ead25f426499d0d" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Caroline">Caroline</span>
                                <span property="foaf:familyName" content="De" meerleer="">De Meerleer </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC22257753A0009000200" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/86be64623362a49c6abcb2d4e49be9366cf248a6819584adb7bc316368f683ab" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Matthias">Matthias</span>
                                <span property="foaf:familyName" content="De" ridder="">De Ridder </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3F957753A000900021A" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/5ce3d2e41eb9407c725b321d0c196abaf3b80fd22f1aa5430f3027cbf7d2fca9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Yasmine">Yasmine</span>
                                <span property="foaf:familyName" content="Deghels">Deghels </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC38157753A0009000214" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/b3231202-18db-4388-bcd9-94d657599aff" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Vincent">Vincent</span>
                                <span property="foaf:familyName" content="Delforge">Delforge </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC30157753A000900020E" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/560124f5661616d251b8d88ddeff2eea1e4e08a5a94603485ce6e4f0e2cb60bf" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Karolien">Karolien</span>
                                <span property="foaf:familyName" content="Devos">Devos </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5FF2E42478A81C0009000A55" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/4fe32472-3bbc-4d28-bc55-c70770adf276" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Marc">Marc</span>
                                <span property="foaf:familyName" content="Dierickx">Dierickx </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC97757753A0009000261" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/5458f33b694e66069365bdcd5790b2265ccd15e7095670fba3e4d5c5187b1730" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Cathy">Cathy</span>
                                <span property="foaf:familyName" content="Grysolle">Grysolle </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC70F57753A000900023F" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/d14aaeb0622a9b5855cc22d71124193cd9020b586ecfa0a8f5e88a2fa411d7a4" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Steve">Steve</span>
                                <span property="foaf:familyName" content="Herman">Herman </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/635A80B944D3E2E4388C8417" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/5cf2168f-b242-400e-82b7-fa78d11acf2a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Maxine">Maxine</span>
                                <span property="foaf:familyName" content="Mc" kenzie="">Mc Kenzie </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/650AAF6916D6388FC956BCAC" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/f2a49e2b-ed1b-4fec-ba37-c41e7d2c095a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                                <span property="foaf:familyName" content="Moraleda-Barona">Moraleda-Barona </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC4E857753A0009000226" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/60ef8d59dad103083f5585e3ae401f9af80f59011c3e4535aff3e068d0e69ba6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Theo">Theo</span>
                                <span property="foaf:familyName" content="Nsengimana">Nsengimana </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/605890C59006E9000800002D" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/4491c016-b19a-469c-ad8e-c725be535e59" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Deniz">Deniz</span>
                                <span property="foaf:familyName" content="Özkan">Özkan </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC2DB57753A000900020C" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/ad809d705a2a9450a9f5d4196f628e57660a5b23844d77e5c7929e0c1669182b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Iwein">Iwein</span>
                                <span property="foaf:familyName" content="Quintelier">Quintelier </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC35657753A0009000212" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/a0a53cc4-e4ea-4fbc-8e6e-6be96bc23298" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                                <span property="foaf:familyName" content="Sidorski">Sidorski </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBF6657753A00090001ED" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/757d15975fdbbb28147146e84778554682d2446682428233b7a13c900364b81b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                                <span property="foaf:familyName" content="Smeyers">Smeyers </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DF1F5B9A3ACB60008000014" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/ed97834da3e17151699c41c2eeaccc0c9473dca64209f0608660937632be9ea7" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Michel">Michel</span>
                                <span property="foaf:familyName" content="Van" brempt="">Van Brempt </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6058904D9006E90008000027" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/db35d79036a5ea82fe41e2a90ed2dc8c5327ea7c1033e47be0ea418103241a82" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Sam">Sam</span>
                                <span property="foaf:familyName" content="Van" de="" putte="">Van de Putte </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC94F57753A000900025E" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/7e3f6d69eed2db8d2d49344aac162cb0151e041a7ef4696ff2d9a214d4dd6a85" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Ann">Ann</span>
                                <span property="foaf:familyName" content="Van" de="" steen="">Van de Steen </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61790DF1890F3E0008000053" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/e4b9c71b-50c7-488b-baa4-bba423a1dda3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Filip">Filip</span>
                                <span property="foaf:familyName" content="Van" de="" winkel="">Van De Winkel </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC66457753A0009000238" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/57e4f501c0ca4205422cbadf61de7ef1d4b0b84ba897647aa84acd02ac3a46ef" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Bart">Bart</span>
                                <span property="foaf:familyName" content="Van" den="" neste="">Van den Neste </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC73457753A0009000242" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/eed3550929ccf5097bc125693b2d1c1ea62bac378534a86ced36c9b950793e30" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Johan">Johan</span>
                                <span property="foaf:familyName" content="Van" nieuwenhove="">Van Nieuwenhove </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBFDD57753A00090001EF" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/175368c1621d70b7e18a65527b72d7069320fd3f3a0322b6ab7e167dd31a8d03" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Karim">Karim</span>
                                <span property="foaf:familyName" content="Van" overmeire="">Van Overmeire </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC75B57753A0009000244" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/eecf6879-f873-4b01-9b69-8270c15a8083" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Els">Els</span>
                                <span property="foaf:familyName" content="Van" puyvelde="">Van Puyvelde </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC32D57753A0009000210" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/00a3eb8d34547251de033ce21f5f52395ad1c377c10d5774f4d279d625ef69e8" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Kris">Kris</span>
                                <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB3AA4A3ACB60008000934" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/16f03b09a9766484909a87c46b524f1165d6bd3b79650cec0c0c27fb4352d46e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Silke">Silke</span>
                                <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6244235D77B95A00080001F8" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/829cde9c-2706-4b27-a81b-277915309bb9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Dirk">Dirk</span>
                                <span property="foaf:familyName" content="Verleysen">Verleysen </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC81257753A000900024D" property="besluit:heeftAanwezige">
                              <span resource="http://data.lblod.info/id/personen/3c510b492c9894e967e7744d2e3bea670cfcb05412e65b725173fefcc550e273" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Lander">Lander</span>
                                <span property="foaf:familyName" content="Wantens">Wantens </span>
                              </span>
                            </li>
                        </ul>
                      </div>
                      <div class="au-c-template-list-container">
                        <p>
                          <strong>Effectieve stemmers</strong>
                        </p>
                        <ul class="au-c-template-list-inline">
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC86657753A0009000252" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/f202051a-f5c0-4aa4-8b6b-7980a8239ed5" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Ingmar">Ingmar</span>
                                <span property="foaf:familyName" content="Baeyens">Baeyens </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB38FDA3ACB60008000925" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/55e684ff368fb1434c5d0923efac0fdffb84d67c4a9b2c8bb24064f0bd3d57b3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Katrien">Katrien</span>
                                <span property="foaf:familyName" content="Beulens">Beulens </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC78257753A0009000247" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/fc1d01ab-1b3c-491b-9080-23e7147002a6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                                <span property="foaf:familyName" content="Blanckaert">Blanckaert </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3D257753A0009000218" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/0b197d19320ac3cd4f36caaa1b8027dddbeda9968ecbf7c17295292c385b1724" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Maarten">Maarten</span>
                                <span property="foaf:familyName" content="Blommaert">Blommaert </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5E9FF933A3ACB6000800016A" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/fe005c2b1f3b7c4895a184876600c6535249ef706d22a424b907b787d7a8a4d0" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Pieter">Pieter</span>
                                <span property="foaf:familyName" content="Cassiman">Cassiman </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC7A757753A0009000249" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/0d6c7612-24bc-4ea1-af50-f86fa519a421" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Guy">Guy</span>
                                <span property="foaf:familyName" content="Claus">Claus </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5F3CC5D1F9D30200080001F0" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/daa639812c66ae23788a630022c95cb09268c721c3d88a2ee4f7271d253c822c" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="David">David</span>
                                <span property="foaf:familyName" content="Coppens">Coppens </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC53A57753A000900022A" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/910a001529fc4066dd8937e22d20140daafad01a5225995b2a464115d58db4e9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Eddy">Eddy</span>
                                <span property="foaf:familyName" content="Couckuyt">Couckuyt </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DCA2D57753A0009000268" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/ac7c0cec477cc285a64e2ab49dbf472d72552c43caf849a827ac7766b9894282" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Christoph">Christoph</span>
                                <span property="foaf:familyName" content="D'Haese">D'Haese </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61C2F033E4465300080002C1" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/c50701f5-cc87-4a17-80a7-70c8c234623b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                                <span property="foaf:familyName" content="De" bruecker="">De Bruecker </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC5AE57753A0009000234" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/acedf4067acac7837a1089ec6cdc38a79c8efb569493dd8bbbd7af70d8fb5640" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Martine">Martine</span>
                                <span property="foaf:familyName" content="De" maght="">De Maght </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC27057753A0009000208" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/6c4dc6f7b1bc51eb4084d84481f0bc93c7778145fd256ad62ead25f426499d0d" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Caroline">Caroline</span>
                                <span property="foaf:familyName" content="De" meerleer="">De Meerleer </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC22257753A0009000200" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/86be64623362a49c6abcb2d4e49be9366cf248a6819584adb7bc316368f683ab" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Matthias">Matthias</span>
                                <span property="foaf:familyName" content="De" ridder="">De Ridder </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3F957753A000900021A" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/5ce3d2e41eb9407c725b321d0c196abaf3b80fd22f1aa5430f3027cbf7d2fca9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Yasmine">Yasmine</span>
                                <span property="foaf:familyName" content="Deghels">Deghels </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC38157753A0009000214" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/b3231202-18db-4388-bcd9-94d657599aff" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Vincent">Vincent</span>
                                <span property="foaf:familyName" content="Delforge">Delforge </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC30157753A000900020E" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/560124f5661616d251b8d88ddeff2eea1e4e08a5a94603485ce6e4f0e2cb60bf" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Karolien">Karolien</span>
                                <span property="foaf:familyName" content="Devos">Devos </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5FF2E42478A81C0009000A55" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/4fe32472-3bbc-4d28-bc55-c70770adf276" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Marc">Marc</span>
                                <span property="foaf:familyName" content="Dierickx">Dierickx </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC97757753A0009000261" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/5458f33b694e66069365bdcd5790b2265ccd15e7095670fba3e4d5c5187b1730" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Cathy">Cathy</span>
                                <span property="foaf:familyName" content="Grysolle">Grysolle </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC70F57753A000900023F" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/d14aaeb0622a9b5855cc22d71124193cd9020b586ecfa0a8f5e88a2fa411d7a4" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Steve">Steve</span>
                                <span property="foaf:familyName" content="Herman">Herman </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/635A80B944D3E2E4388C8417" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/5cf2168f-b242-400e-82b7-fa78d11acf2a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Maxine">Maxine</span>
                                <span property="foaf:familyName" content="Mc" kenzie="">Mc Kenzie </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/650AAF6916D6388FC956BCAC" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/f2a49e2b-ed1b-4fec-ba37-c41e7d2c095a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                                <span property="foaf:familyName" content="Moraleda-Barona">Moraleda-Barona </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC4E857753A0009000226" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/60ef8d59dad103083f5585e3ae401f9af80f59011c3e4535aff3e068d0e69ba6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Theo">Theo</span>
                                <span property="foaf:familyName" content="Nsengimana">Nsengimana </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/605890C59006E9000800002D" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/4491c016-b19a-469c-ad8e-c725be535e59" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Deniz">Deniz</span>
                                <span property="foaf:familyName" content="Özkan">Özkan </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC2DB57753A000900020C" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/ad809d705a2a9450a9f5d4196f628e57660a5b23844d77e5c7929e0c1669182b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Iwein">Iwein</span>
                                <span property="foaf:familyName" content="Quintelier">Quintelier </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC35657753A0009000212" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/a0a53cc4-e4ea-4fbc-8e6e-6be96bc23298" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                                <span property="foaf:familyName" content="Sidorski">Sidorski </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBF6657753A00090001ED" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/757d15975fdbbb28147146e84778554682d2446682428233b7a13c900364b81b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                                <span property="foaf:familyName" content="Smeyers">Smeyers </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DF1F5B9A3ACB60008000014" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/ed97834da3e17151699c41c2eeaccc0c9473dca64209f0608660937632be9ea7" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Michel">Michel</span>
                                <span property="foaf:familyName" content="Van" brempt="">Van Brempt </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6058904D9006E90008000027" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/db35d79036a5ea82fe41e2a90ed2dc8c5327ea7c1033e47be0ea418103241a82" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Sam">Sam</span>
                                <span property="foaf:familyName" content="Van" de="" putte="">Van de Putte </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC94F57753A000900025E" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/7e3f6d69eed2db8d2d49344aac162cb0151e041a7ef4696ff2d9a214d4dd6a85" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Ann">Ann</span>
                                <span property="foaf:familyName" content="Van" de="" steen="">Van de Steen </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61790DF1890F3E0008000053" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/e4b9c71b-50c7-488b-baa4-bba423a1dda3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Filip">Filip</span>
                                <span property="foaf:familyName" content="Van" de="" winkel="">Van De Winkel </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC66457753A0009000238" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/57e4f501c0ca4205422cbadf61de7ef1d4b0b84ba897647aa84acd02ac3a46ef" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Bart">Bart</span>
                                <span property="foaf:familyName" content="Van" den="" neste="">Van den Neste </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC73457753A0009000242" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/eed3550929ccf5097bc125693b2d1c1ea62bac378534a86ced36c9b950793e30" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Johan">Johan</span>
                                <span property="foaf:familyName" content="Van" nieuwenhove="">Van Nieuwenhove </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBFDD57753A00090001EF" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/175368c1621d70b7e18a65527b72d7069320fd3f3a0322b6ab7e167dd31a8d03" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Karim">Karim</span>
                                <span property="foaf:familyName" content="Van" overmeire="">Van Overmeire </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC75B57753A0009000244" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/eecf6879-f873-4b01-9b69-8270c15a8083" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Els">Els</span>
                                <span property="foaf:familyName" content="Van" puyvelde="">Van Puyvelde </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC32D57753A0009000210" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/00a3eb8d34547251de033ce21f5f52395ad1c377c10d5774f4d279d625ef69e8" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Kris">Kris</span>
                                <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB3AA4A3ACB60008000934" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/16f03b09a9766484909a87c46b524f1165d6bd3b79650cec0c0c27fb4352d46e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Silke">Silke</span>
                                <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6244235D77B95A00080001F8" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/829cde9c-2706-4b27-a81b-277915309bb9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Dirk">Dirk</span>
                                <span property="foaf:familyName" content="Verleysen">Verleysen </span>
                              </span>
                            </li>
                            <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC81257753A000900024D" property="besluit:heeftStemmer">
                              <span resource="http://data.lblod.info/id/personen/3c510b492c9894e967e7744d2e3bea670cfcb05412e65b725173fefcc550e273" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                <span property="persoon:gebruikteVoornaam" content="Lander">Lander</span>
                                <span property="foaf:familyName" content="Wantens">Wantens </span>
                              </span>
                            </li>
                        </ul>
                      </div>
                  <p>
                    Totaal aantal voorstanders:
                    <span datatype="xsd:integer" property="besluit:aantalVoorstanders" content="33">33</span>
                  </p>
                  <p>
                    Totaal aantal tegenstanders:
                    <span datatype="xsd:integer" property="besluit:aantalTegenstanders" content="3">3</span>
                  </p>
                  <p>
                    Totaal aantal onthoudingen, blanco of ongeldig:
                    <span datatype="xsd:integer" property="besluit:aantalOnthouders" content="2">2</span>
                  </p>
                          <div class="au-c-template-list-container">
                            <p>
                              <strong>Voorstanders</strong>
                            </p>
                            <ul class="au-c-template-list-inline">
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC86657753A0009000252" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/f202051a-f5c0-4aa4-8b6b-7980a8239ed5" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Ingmar">Ingmar</span>
                                    <span property="foaf:familyName" content="Baeyens">Baeyens </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB38FDA3ACB60008000925" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/55e684ff368fb1434c5d0923efac0fdffb84d67c4a9b2c8bb24064f0bd3d57b3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Katrien">Katrien</span>
                                    <span property="foaf:familyName" content="Beulens">Beulens </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC78257753A0009000247" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/fc1d01ab-1b3c-491b-9080-23e7147002a6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Anja">Anja</span>
                                    <span property="foaf:familyName" content="Blanckaert">Blanckaert </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3D257753A0009000218" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/0b197d19320ac3cd4f36caaa1b8027dddbeda9968ecbf7c17295292c385b1724" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Maarten">Maarten</span>
                                    <span property="foaf:familyName" content="Blommaert">Blommaert </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61C2F033E4465300080002C1" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/c50701f5-cc87-4a17-80a7-70c8c234623b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                                    <span property="foaf:familyName" content="De" bruecker="">De Bruecker </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC5AE57753A0009000234" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/acedf4067acac7837a1089ec6cdc38a79c8efb569493dd8bbbd7af70d8fb5640" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Martine">Martine</span>
                                    <span property="foaf:familyName" content="De" maght="">De Maght </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC27057753A0009000208" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/6c4dc6f7b1bc51eb4084d84481f0bc93c7778145fd256ad62ead25f426499d0d" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Caroline">Caroline</span>
                                    <span property="foaf:familyName" content="De" meerleer="">De Meerleer </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC22257753A0009000200" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/86be64623362a49c6abcb2d4e49be9366cf248a6819584adb7bc316368f683ab" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Matthias">Matthias</span>
                                    <span property="foaf:familyName" content="De" ridder="">De Ridder </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC3F957753A000900021A" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/5ce3d2e41eb9407c725b321d0c196abaf3b80fd22f1aa5430f3027cbf7d2fca9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Yasmine">Yasmine</span>
                                    <span property="foaf:familyName" content="Deghels">Deghels </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC38157753A0009000214" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/b3231202-18db-4388-bcd9-94d657599aff" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Vincent">Vincent</span>
                                    <span property="foaf:familyName" content="Delforge">Delforge </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC30157753A000900020E" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/560124f5661616d251b8d88ddeff2eea1e4e08a5a94603485ce6e4f0e2cb60bf" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Karolien">Karolien</span>
                                    <span property="foaf:familyName" content="Devos">Devos </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5FF2E42478A81C0009000A55" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/4fe32472-3bbc-4d28-bc55-c70770adf276" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Marc">Marc</span>
                                    <span property="foaf:familyName" content="Dierickx">Dierickx </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC97757753A0009000261" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/5458f33b694e66069365bdcd5790b2265ccd15e7095670fba3e4d5c5187b1730" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Cathy">Cathy</span>
                                    <span property="foaf:familyName" content="Grysolle">Grysolle </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC70F57753A000900023F" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/d14aaeb0622a9b5855cc22d71124193cd9020b586ecfa0a8f5e88a2fa411d7a4" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Steve">Steve</span>
                                    <span property="foaf:familyName" content="Herman">Herman </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/635A80B944D3E2E4388C8417" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/5cf2168f-b242-400e-82b7-fa78d11acf2a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Maxine">Maxine</span>
                                    <span property="foaf:familyName" content="Mc" kenzie="">Mc Kenzie </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/650AAF6916D6388FC956BCAC" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/f2a49e2b-ed1b-4fec-ba37-c41e7d2c095a" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                                    <span property="foaf:familyName" content="Moraleda-Barona">Moraleda-Barona </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC4E857753A0009000226" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/60ef8d59dad103083f5585e3ae401f9af80f59011c3e4535aff3e068d0e69ba6" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Theo">Theo</span>
                                    <span property="foaf:familyName" content="Nsengimana">Nsengimana </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/605890C59006E9000800002D" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/4491c016-b19a-469c-ad8e-c725be535e59" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Deniz">Deniz</span>
                                    <span property="foaf:familyName" content="Özkan">Özkan </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC2DB57753A000900020C" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/ad809d705a2a9450a9f5d4196f628e57660a5b23844d77e5c7929e0c1669182b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Iwein">Iwein</span>
                                    <span property="foaf:familyName" content="Quintelier">Quintelier </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC35657753A0009000212" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/a0a53cc4-e4ea-4fbc-8e6e-6be96bc23298" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Raf">Raf</span>
                                    <span property="foaf:familyName" content="Sidorski">Sidorski </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBF6657753A00090001ED" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/757d15975fdbbb28147146e84778554682d2446682428233b7a13c900364b81b" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Sarah">Sarah</span>
                                    <span property="foaf:familyName" content="Smeyers">Smeyers </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DF1F5B9A3ACB60008000014" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/ed97834da3e17151699c41c2eeaccc0c9473dca64209f0608660937632be9ea7" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Michel">Michel</span>
                                    <span property="foaf:familyName" content="Van" brempt="">Van Brempt </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6058904D9006E90008000027" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/db35d79036a5ea82fe41e2a90ed2dc8c5327ea7c1033e47be0ea418103241a82" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Sam">Sam</span>
                                    <span property="foaf:familyName" content="Van" de="" putte="">Van de Putte </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC94F57753A000900025E" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/7e3f6d69eed2db8d2d49344aac162cb0151e041a7ef4696ff2d9a214d4dd6a85" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Ann">Ann</span>
                                    <span property="foaf:familyName" content="Van" de="" steen="">Van de Steen </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/61790DF1890F3E0008000053" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/e4b9c71b-50c7-488b-baa4-bba423a1dda3" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Filip">Filip</span>
                                    <span property="foaf:familyName" content="Van" de="" winkel="">Van De Winkel </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC66457753A0009000238" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/57e4f501c0ca4205422cbadf61de7ef1d4b0b84ba897647aa84acd02ac3a46ef" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Bart">Bart</span>
                                    <span property="foaf:familyName" content="Van" den="" neste="">Van den Neste </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC73457753A0009000242" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/eed3550929ccf5097bc125693b2d1c1ea62bac378534a86ced36c9b950793e30" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Johan">Johan</span>
                                    <span property="foaf:familyName" content="Van" nieuwenhove="">Van Nieuwenhove </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DBFDD57753A00090001EF" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/175368c1621d70b7e18a65527b72d7069320fd3f3a0322b6ab7e167dd31a8d03" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Karim">Karim</span>
                                    <span property="foaf:familyName" content="Van" overmeire="">Van Overmeire </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC75B57753A0009000244" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/eecf6879-f873-4b01-9b69-8270c15a8083" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Els">Els</span>
                                    <span property="foaf:familyName" content="Van" puyvelde="">Van Puyvelde </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC32D57753A0009000210" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/00a3eb8d34547251de033ce21f5f52395ad1c377c10d5774f4d279d625ef69e8" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Kris">Kris</span>
                                    <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5DFB3AA4A3ACB60008000934" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/16f03b09a9766484909a87c46b524f1165d6bd3b79650cec0c0c27fb4352d46e" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Silke">Silke</span>
                                    <span property="foaf:familyName" content="Van" vaerenbergh="">Van Vaerenbergh </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/6244235D77B95A00080001F8" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/829cde9c-2706-4b27-a81b-277915309bb9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Dirk">Dirk</span>
                                    <span property="foaf:familyName" content="Verleysen">Verleysen </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC81257753A000900024D" property="besluit:heeftVoorstander">
                                  <span resource="http://data.lblod.info/id/personen/3c510b492c9894e967e7744d2e3bea670cfcb05412e65b725173fefcc550e273" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Lander">Lander</span>
                                    <span property="foaf:familyName" content="Wantens">Wantens </span>
                                  </span>
                                </li>
                            </ul>
                          </div>
                          <div class="au-c-template-list-container">
                            <p>
                              <strong>Tegenstanders</strong>
                            </p>
                            <ul class="au-c-template-list-inline">
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5E9FF933A3ACB6000800016A" property="besluit:heeftTegenstander">
                                  <span resource="http://data.lblod.info/id/personen/fe005c2b1f3b7c4895a184876600c6535249ef706d22a424b907b787d7a8a4d0" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Pieter">Pieter</span>
                                    <span property="foaf:familyName" content="Cassiman">Cassiman </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC7A757753A0009000249" property="besluit:heeftTegenstander">
                                  <span resource="http://data.lblod.info/id/personen/0d6c7612-24bc-4ea1-af50-f86fa519a421" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Guy">Guy</span>
                                    <span property="foaf:familyName" content="Claus">Claus </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5F3CC5D1F9D30200080001F0" property="besluit:heeftTegenstander">
                                  <span resource="http://data.lblod.info/id/personen/daa639812c66ae23788a630022c95cb09268c721c3d88a2ee4f7271d253c822c" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="David">David</span>
                                    <span property="foaf:familyName" content="Coppens">Coppens </span>
                                  </span>
                                </li>
                            </ul>
                          </div>
                          <div class="au-c-template-list-container">
                            <p>
                              <strong>Onthoudingen, blanco of ongeldig</strong>
                            </p>
                            <ul class="au-c-template-list-inline">
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DC53A57753A000900022A" property="besluit:heeftOnthouders">
                                  <span resource="http://data.lblod.info/id/personen/910a001529fc4066dd8937e22d20140daafad01a5225995b2a464115d58db4e9" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Eddy">Eddy</span>
                                    <span property="foaf:familyName" content="Couckuyt">Couckuyt </span>
                                  </span>
                                </li>
                                <li class="au-c-template-list-inline__item" typeof="http://data.vlaanderen.be/ns/mandaat#Mandataris" resource="http://data.lblod.info/id/mandatarissen/5C3DCA2D57753A0009000268" property="besluit:heeftOnthouders">
                                  <span resource="http://data.lblod.info/id/personen/ac7c0cec477cc285a64e2ab49dbf472d72552c43caf849a827ac7766b9894282" property="mandaat:isBestuurlijkeAliasVan" typeof="person:Person">
                                    <span property="persoon:gebruikteVoornaam" content="Christoph">Christoph</span>
                                    <span property="foaf:familyName" content="D'Haese">D'Haese </span>
                                  </span>
                                </li>
                            </ul>
                          </div>
                  <p>Met als gevolg,</p>
                  <p lang="nl-BE" property="besluit:gevolg">The voting is approved</p>
                
              </div>
            </div>
          <div class="c-template-content c-template-content--treatment">
            <div lang="nl-BE" data-say-document="true"><div class="say-editable" about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9"><div style="display: none" data-rdfa-container="true"><span about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://data.vlaanderen.be/ns/besluit#Besluit"></span><span about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://mu.semte.ch/vocabularies/ext/BesluitNieuweStijl"></span><span about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="https://data.vlaanderen.be/id/concept/BesluitType/a0a709a7-ac07-4457-8d40-de4aea9b1432"></span><span rev="http://www.w3.org/ns/prov#generated" resource="http://example.org#"></span></div><div data-content-container="true"><p>Openbare titel besluit:</p><h4 class="say-editable" about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9" property="http://data.europa.eu/eli/ontology#title" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true"><span style="display: none" data-rdfa-container="true"></span><span data-content-container="true"><p>Title</p></span></h4><span properties="[object Object]" backlinks="[object Object],[object Object]" __rdfaid="6b2b25b3-48cc-48c4-9bc8-92d90cb78454" rdfanodetype="resource" subject="http://publications.europa.eu/resource/authority/language/NLD" style="style=&quot;display:none;&quot;" property="eli:language" typeof="skos:Concept"></span><p><br></p><p>Korte openbare beschrijving:</p><div class="say-editable" about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9" property="http://data.europa.eu/eli/ontology#description" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true"><div style="display: none" data-rdfa-container="true"></div><div data-content-container="true"><p><span class="mark-highlight-manual" placeholdertext="Geef korte beschrijving op" contenteditable="false">Geef korte beschrijving op</span></p></div></div><p><br></p><div class="say-editable" about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9" property="http://data.vlaanderen.be/ns/besluit#motivering" lang="nl" data-literal-node="true"><div style="display: none" data-rdfa-container="true"></div><div data-content-container="true"><p><span class="mark-highlight-manual" placeholdertext="geef bestuursorgaan op" contenteditable="false">geef bestuursorgaan op</span>,</p><p><br></p><h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left">Bevoegdheid</h5><ul style="unordered" hierarchical="false"><li data-list-marker="1. "><p><span class="mark-highlight-manual" placeholdertext="Rechtsgrond die bepaalt dat dit orgaan bevoegd is." contenteditable="false">Rechtsgrond die bepaalt dat dit orgaan bevoegd is.</span></p></li></ul><p><br></p><h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left">Juridische context</h5><ul style="unordered" hierarchical="false"><li data-list-marker="1. "><p>decreet <a typeof="eli:LegalExpression" property="eli:cites" href="https://codex.vlaanderen.be/doc/document/1030009">Bestuursdecreet</a></p></li></ul><p><br></p><h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left">Feitelijke context en argumentatie</h5><ul style="unordered" hierarchical="false"><li data-list-marker="1. "><p><span class="mark-highlight-manual" placeholdertext="Voeg context en argumentatie in" contenteditable="false">Voeg context en argumentatie in</span></p></li></ul></div></div><p><br><br></p><h5 data-indentation-level="0" style="" level="5" indentationlevel="0" alignment="left">Beslissing</h5><div class="say-editable" about="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9" property="http://www.w3.org/ns/prov#value" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true"><div style="display: none" data-rdfa-container="true"></div><div data-content-container="true"><div class="say-editable" about="http://data.lblod.info/artikels/738b569b-5415-49ff-bbd7-248b0dffd1b7"><div style="display: none" data-rdfa-container="true"><span about="http://data.lblod.info/artikels/738b569b-5415-49ff-bbd7-248b0dffd1b7" property="http://www.w3.org/1999/02/22-rdf-syntax-ns#type" resource="http://data.vlaanderen.be/ns/besluit#Artikel"></span><span rev="http://data.europa.eu/eli/ontology#has_part" resource="http://data.lblod.info/id/besluiten/b456b76d-07f0-4e0e-9909-cad1bfa4c2c9"></span></div><div data-content-container="true"><div contenteditable="false">Artikel <span property="eli:number" datatype="xsd:integer">1</span></div><span properties="[object Object]" backlinks="[object Object],[object Object]" __rdfaid="29b4f4df-8570-40c1-a7f6-2922223ea38a" rdfanodetype="resource" subject="http://publications.europa.eu/resource/authority/language/NLD" style="style=&quot;display:none;&quot;" property="eli:language" typeof="skos:Concept"></span><div class="say-editable" about="http://data.lblod.info/artikels/738b569b-5415-49ff-bbd7-248b0dffd1b7" property="http://www.w3.org/ns/prov#value" datatype="http://www.w3.org/2001/XMLSchema#string" lang="" data-literal-node="true"><div style="display: none" data-rdfa-container="true"></div><div data-content-container="true"><p>Article content</p></div></div></div></div></div></div></div></div></div>
          </div>
        </div>
    </div>

    <h2>
      De voorzitter sluit de zitting op
      <span content="2024-05-31T10:12:51.675Z" datatype="xsd:dateTime" property="prov:endedAtTime" class="is-required">
        31/05/2024 12:12
      </span>.
    </h2>
      <p>
        </p><div lang="nl-BE" data-say-document="true"><p>Free text outro</p></div>
      <p></p>
  </div>
</div>
</div>
    </div>`;
    this.dataset = await htmlToRdf(html);
    //Mock the publication base url
    process.env.PUBLICATION_BASE_URL = 'http://my-example.org';
  });

  // it('has the expected administrative body linked to the meeting', function () {
  //   const adminBodyQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#isGehoudenDoor'),
  //     factory.namedNode(meeting.adminBodyUri)
  //   );
  //   assert(this.dataset.has(adminBodyQuad));
  // });

  // it('has the expected zitting type', function () {
  //   const typeQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode(RDF_TYPE),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#Zitting')
  //   );
  //   assert(this.dataset.has(typeQuad));
  // });

  // it('has the correct planned start date', function () {
  //   const plannedStartQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#geplandeStart'),
  //     factory.literal(
  //       meeting.plannedStart,
  //       'http://www.w3.org/2001/XMLSchema#dateTime'
  //     )
  //   );
  //   assert(this.dataset.has(plannedStartQuad));
  // });

  // it('has the correct start date', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode('http://www.w3.org/ns/prov#startedAtTime'),
  //     factory.literal(
  //       meeting.startedAt,
  //       'http://www.w3.org/2001/XMLSchema#dateTime'
  //     )
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('has the correct end date', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode('http://www.w3.org/ns/prov#endedAtTime'),
  //     factory.literal(
  //       meeting.endedAt,
  //       'http://www.w3.org/2001/XMLSchema#dateTime'
  //     )
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('includes agendapoint 1', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(agendapoint1.uri),
  //     factory.namedNode(RDF_TYPE),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#Agendapunt')
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('includes agendapoint 2', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(agendapoint2.uri),
  //     factory.namedNode(RDF_TYPE),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#Agendapunt')
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('includes behandeling 1', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(treatmentData1.treatment.uri),
  //     factory.namedNode(RDF_TYPE),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt'
  //     )
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('includes behandeling 2', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(treatmentData2.treatment.uri),
  //     factory.namedNode(RDF_TYPE),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt'
  //     )
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('includes intermission', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(intermission.uri),
  //     factory.namedNode(RDF_TYPE),
  //     factory.namedNode('http://mu.semte.ch/vocabularies/ext/Intermission')
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('person 1 is present on the meeting', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#heeftAanwezigeBijStart'
  //     ),
  //     factory.namedNode(person1.uri)
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('person 2 is not present on the meeting', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode(
  //       'http://mu.semte.ch/vocabularies/ext/heeftAfwezigeBijStart'
  //     ),
  //     factory.namedNode(person2.uri)
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('person 3 is chairman of the meeting', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftVoorzitter'),
  //     factory.namedNode(person3.uri)
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('person 4 is chairman of the meeting', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(meeting.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftSecretaris'),
  //     factory.namedNode(person4.uri)
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('voting appears on the behandeling', function () {
  //   const startQuad = factory.quad(
  //     factory.namedNode(treatmentData1.treatment.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftStemming'),
  //     factory.namedNode(stemming.uri)
  //   );
  //   assert(this.dataset.has(startQuad));
  // });

  // it('voting is correct', function () {
  //   const geheimQuad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#geheim'),
  //     factory.literal(
  //       String(stemming.isSecret),
  //       'http://www.w3.org/2001/XMLSchema#boolean'
  //     )
  //   );
  //   assert(this.dataset.has(geheimQuad));

  //   // lang string not correctly parsed by n3 atm, see https://github.com/rdfjs/N3.js/issues/252
  //   // const subjectQuad = factory.quad(
  //   //   factory.namedNode(stemming.uri),
  //   //   factory.namedNode('http://data.vlaanderen.be/ns/besluit#onderwerp'),
  //   //   factory.literal(stemming.subject, "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString")
  //   // );
  //   // assert(this.dataset.has(subjectQuad));

  //   const attendees1Quad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftAanwezige'),
  //     factory.namedNode(stemming.attendees[0].uri)
  //   );
  //   assert(this.dataset.has(attendees1Quad));

  //   const attendees2Quad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftAanwezige'),
  //     factory.namedNode(stemming.attendees[1].uri)
  //   );
  //   assert(this.dataset.has(attendees2Quad));

  //   const voters1Quad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftStemmer'),
  //     factory.namedNode(stemming.voters[0].uri)
  //   );
  //   assert(this.dataset.has(voters1Quad));

  //   const voters2Quad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftStemmer'),
  //     factory.namedNode(stemming.voters[1].uri)
  //   );
  //   assert(this.dataset.has(voters2Quad));

  //   const positiveVotesQuad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#aantalVoorstanders'
  //     ),
  //     factory.literal(
  //       String(stemming.positiveVotes),
  //       'http://www.w3.org/2001/XMLSchema#integer'
  //     )
  //   );
  //   assert(this.dataset.has(positiveVotesQuad));

  //   const negativeVotesQuad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#aantalTegenstanders'
  //     ),
  //     factory.literal(
  //       String(stemming.negativeVotes),
  //       'http://www.w3.org/2001/XMLSchema#integer'
  //     )
  //   );
  //   assert(this.dataset.has(negativeVotesQuad));

  //   const abstentionVotesQuad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#aantalOnthouders'
  //     ),
  //     factory.literal(
  //       String(stemming.abstentionVotes),
  //       'http://www.w3.org/2001/XMLSchema#integer'
  //     )
  //   );
  //   assert(this.dataset.has(abstentionVotesQuad));
  //   const positiveVotersQuad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#heeftVoorstander'
  //     ),
  //     factory.namedNode(stemming.positiveVoters[0].uri)
  //   );
  //   assert(this.dataset.has(positiveVotersQuad));

  //   const negativeVotersQuad = factory.quad(
  //     factory.namedNode(stemming.uri),
  //     factory.namedNode(
  //       'http://data.vlaanderen.be/ns/besluit#heeftTegenstander'
  //     ),
  //     factory.namedNode(stemming.negativeVoters[0].uri)
  //   );
  //   assert(this.dataset.has(negativeVotersQuad));
  // });

  // it('attachments are linked correctly to the behandeling', async function () {
  //   setupHandleBars();

  //   const html = appendAttachmentsToDocument(
  //     treatmentData1.content,
  //     [attachment1, attachment2],
  //     IS_FINAL
  //   );
  //   const dataset = await htmlToRdf(html);
  //   const attachment1Quad = factory.quad(
  //     factory.namedNode('http://my-example.org/besluit/1'),
  //     factory.namedNode('eli:related_to'),
  //     factory.namedNode(
  //       `http://my-example.org/files/${attachment1.fileUuid}/download`
  //     )
  //   );

  //   const attachment1ReverseQuad = factory.quad(
  //     factory.namedNode(
  //       `http://my-example.org/files/${attachment1.fileUuid}/download`
  //     ),
  //     factory.namedNode('dct:isPartOf'),
  //     factory.namedNode('http://my-example.org/besluit/1')
  //   );

  //   const attachment2Quad = factory.quad(
  //     factory.namedNode('http://my-example.org/besluit/1'),
  //     factory.namedNode('eli:related_to'),
  //     factory.namedNode(
  //       `http://my-example.org/files/${attachment2.fileUuid}/download`
  //     )
  //   );
  //   assert(dataset.has(attachment1Quad));
  //   assert(dataset.has(attachment1ReverseQuad));
  //   assert(dataset.has(attachment2Quad));
  // });

  it('validates the basic shacl profile', async function () {
    console.log(JSON.stringify(Array.from(this.dataset._quads)));
    const shacl = await loadDataset(
      path.resolve('test/shapes/meeting-brecth.ttl')
    );
    const validator = new Validator(shacl, { factory });
    const report = await validator.validate({ dataset: this.dataset });
    assert(report.conforms, shaclReportToMessage(report));
  });
});
