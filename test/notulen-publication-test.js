// @ts-nocheck
// @ts-strict-ignore

import factory from '@rdfjs/dataset';
import { strict as assert } from 'assert';
import { before } from 'mocha';
import SHACLValidator from 'rdf-validate-shacl';
import AgendaPoint from '../models/agendapoint';
import Intermission from '../models/intermission';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import Attachment from '../models/attachment';
import { constructHtmlForMeetingNotesFromData } from '../support/notulen-utils';
import { prefixes } from '../support/prefixes';
import { setupHandleBars } from '../support/setup-handlebars';
import { htmlToRdf, loadDataset, shaclReportToMessage } from './helpers';
import { appendAttachmentsToDocument } from '../support/editor-document';
import { IS_FINAL } from '../support/constants';

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
    const html = constructNotulen();
    this.dataset = await htmlToRdf(html);
  });

  it('has the expected administrative body linked to the meeting', function () {
    const adminBodyQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#isGehoudenDoor'),
      factory.namedNode(meeting.adminBodyUri)
    );
    assert(this.dataset.has(adminBodyQuad));
  });

  it('has the expected zitting type', function () {
    const typeQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#Zitting')
    );
    assert(this.dataset.has(typeQuad));
  });

  it('has the correct planned start date', function () {
    const plannedStartQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#geplandeStart'),
      factory.literal(
        meeting.plannedStart,
        'http://www.w3.org/2001/XMLSchema#dateTime'
      )
    );
    assert(this.dataset.has(plannedStartQuad));
  });

  it('has the correct start date', function () {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode('http://www.w3.org/ns/prov#startedAtTime'),
      factory.literal(
        meeting.startedAt,
        'http://www.w3.org/2001/XMLSchema#dateTime'
      )
    );
    assert(this.dataset.has(startQuad));
  });

  it('has the correct end date', function () {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode('http://www.w3.org/ns/prov#endedAtTime'),
      factory.literal(
        meeting.endedAt,
        'http://www.w3.org/2001/XMLSchema#dateTime'
      )
    );
    assert(this.dataset.has(startQuad));
  });

  it('includes agendapoint 1', function () {
    const startQuad = factory.quad(
      factory.namedNode(agendapoint1.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#Agendapunt')
    );
    assert(this.dataset.has(startQuad));
  });

  it('includes agendapoint 2', function () {
    const startQuad = factory.quad(
      factory.namedNode(agendapoint2.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#Agendapunt')
    );
    assert(this.dataset.has(startQuad));
  });

  it('includes behandeling 1', function () {
    const startQuad = factory.quad(
      factory.namedNode(treatmentData1.treatment.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt'
      )
    );
    assert(this.dataset.has(startQuad));
  });

  it('includes behandeling 2', function () {
    const startQuad = factory.quad(
      factory.namedNode(treatmentData2.treatment.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt'
      )
    );
    assert(this.dataset.has(startQuad));
  });

  it('includes intermission', function () {
    const startQuad = factory.quad(
      factory.namedNode(intermission.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode('http://mu.semte.ch/vocabularies/ext/Intermission')
    );
    assert(this.dataset.has(startQuad));
  });

  it('person 1 is present on the meeting', function () {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#heeftAanwezigeBijStart'
      ),
      factory.namedNode(person1.uri)
    );
    assert(this.dataset.has(startQuad));
  });

  it('person 2 is not present on the meeting', function () {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode(
        'http://mu.semte.ch/vocabularies/ext/heeftAfwezigeBijStart'
      ),
      factory.namedNode(person2.uri)
    );
    assert(this.dataset.has(startQuad));
  });

  it('person 3 is chairman of the meeting', function () {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftVoorzitter'),
      factory.namedNode(person3.uri)
    );
    assert(this.dataset.has(startQuad));
  });

  it('person 4 is chairman of the meeting', function () {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftSecretaris'),
      factory.namedNode(person4.uri)
    );
    assert(this.dataset.has(startQuad));
  });

  it('voting appears on the behandeling', function () {
    const startQuad = factory.quad(
      factory.namedNode(treatmentData1.treatment.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftStemming'),
      factory.namedNode(stemming.uri)
    );
    assert(this.dataset.has(startQuad));
  });

  it('voting is correct', function () {
    const geheimQuad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#geheim'),
      factory.literal(
        String(stemming.isSecret),
        'http://www.w3.org/2001/XMLSchema#boolean'
      )
    );
    assert(this.dataset.has(geheimQuad));

    // lang string not correctly parsed by n3 atm, see https://github.com/rdfjs/N3.js/issues/252
    // const subjectQuad = factory.quad(
    //   factory.namedNode(stemming.uri),
    //   factory.namedNode('http://data.vlaanderen.be/ns/besluit#onderwerp'),
    //   factory.literal(stemming.subject, "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString")
    // );
    // assert(this.dataset.has(subjectQuad));

    const attendees1Quad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftAanwezige'),
      factory.namedNode(stemming.attendees[0].uri)
    );
    assert(this.dataset.has(attendees1Quad));

    const attendees2Quad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftAanwezige'),
      factory.namedNode(stemming.attendees[1].uri)
    );
    assert(this.dataset.has(attendees2Quad));

    const voters1Quad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftStemmer'),
      factory.namedNode(stemming.voters[0].uri)
    );
    assert(this.dataset.has(voters1Quad));

    const voters2Quad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#heeftStemmer'),
      factory.namedNode(stemming.voters[1].uri)
    );
    assert(this.dataset.has(voters2Quad));

    const positiveVotesQuad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#aantalVoorstanders'
      ),
      factory.literal(
        String(stemming.positiveVotes),
        'http://www.w3.org/2001/XMLSchema#integer'
      )
    );
    assert(this.dataset.has(positiveVotesQuad));

    const negativeVotesQuad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#aantalTegenstanders'
      ),
      factory.literal(
        String(stemming.negativeVotes),
        'http://www.w3.org/2001/XMLSchema#integer'
      )
    );
    assert(this.dataset.has(negativeVotesQuad));

    const abstentionVotesQuad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#aantalOnthouders'
      ),
      factory.literal(
        String(stemming.abstentionVotes),
        'http://www.w3.org/2001/XMLSchema#integer'
      )
    );
    assert(this.dataset.has(abstentionVotesQuad));
    const positiveVotersQuad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#heeftVoorstander'
      ),
      factory.namedNode(stemming.positiveVoters[0].uri)
    );
    assert(this.dataset.has(positiveVotersQuad));

    const negativeVotersQuad = factory.quad(
      factory.namedNode(stemming.uri),
      factory.namedNode(
        'http://data.vlaanderen.be/ns/besluit#heeftTegenstander'
      ),
      factory.namedNode(stemming.negativeVoters[0].uri)
    );
    assert(this.dataset.has(negativeVotersQuad));
  });

  it('attachments are linked correctly to the behandeling', async function () {
    setupHandleBars();
    const html = appendAttachmentsToDocument(
      treatmentData1.content,
      [attachment1, attachment2],
      IS_FINAL
    );
    const dataset = await htmlToRdf(html);
    const attachment1Quad = factory.quad(
      factory.namedNode('http://my-example.org/besluit/1'),
      factory.namedNode('eli:related_to'),
      factory.namedNode(
        `http://my-example.org/files/${attachment1.fileUuid}/download`
      )
    );

    const attachment1ReverseQuad = factory.quad(
      factory.namedNode(
        `http://my-example.org/files/${attachment1.fileUuid}/download`
      ),
      factory.namedNode('dct:isPartOf'),
      factory.namedNode('http://my-example.org/besluit/1')
    );

    const attachment2Quad = factory.quad(
      factory.namedNode('http://my-example.org/besluit/1'),
      factory.namedNode('eli:related_to'),
      factory.namedNode(
        `http://my-example.org/files/${attachment2.fileUuid}/download`
      )
    );
    assert(dataset.has(attachment1Quad));
    assert(dataset.has(attachment1ReverseQuad));
    assert(dataset.has(attachment2Quad));
  });

  it('validates the basic shacl profile', async function () {
    const shacl = await loadDataset(__dirname + '/shapes/meeting.ttl');
    const validator = new SHACLValidator(shacl, { factory });
    const report = await validator.validate(this.dataset);
    assert(report.conforms, shaclReportToMessage(report));
  });
});
