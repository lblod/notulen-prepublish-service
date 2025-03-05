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
  content: `<div property="prov:generated" about="http://my-example.org/besluit/1" typeof="http://data.vlaanderen.be/ns/besluit#Besluit http://mu.semte.ch/vocabularies/ext/BesluitNieuweStijl https://data.vlaanderen.be/id/concept/BesluitType/e96ec8af-6480-4b32-876a-fefe5f0a3793" data-editor-position-level="3" data-editor-rdfa-position-level="2"><span property="ext:hiddenBesluitType" class="u-hidden">https://data.vlaanderen.be/id/concept/BesluitType/e96ec8af-6480-4b32-876a-fefe5f0a3793</span>
      <p>Openbare titel besluit:</p>
      <h4 class="h4" property="eli:title" datatype="xsd:string">Title 1</h4>
      <span style="display:none;" property="eli:language" about="http://publications.europa.eu/resource/authority/language/NLD" typeof="skos:Concept">&nbsp;</span>
      <br>
      <p>Korte openbare beschrijving:</p>
      <p property="eli:description" datatype="xsd:string">Description 1</p>
      <br>

      <div property="besluit:motivering" lang="nl" data-editor-position-level="2" data-editor-rdfa-position-level="1">
        <p>
          <span class="mark-highlight-manual">geef bestuursorgaan op</span>,
        </p>
        <br>

        <h5 data-editor-position-level="1">Bevoegdheid</h5>
        <ul class="bullet-list"><li><span class="mark-highlight-manual">Rechtsgrond die bepaalt dat dit orgaan bevoegd is.</span></li></ul>
        <br>

        <h5>Juridische context</h5>
        <ul class="bullet-list"><li><span class="mark-highlight-manual">Voeg juridische context in</span></li></ul>
        <br>

        <h5>Feitelijke context en argumentatie</h5>
        <ul class="bullet-list"><li><span class="mark-highlight-manual">Voeg context en argumentatie in</span></li></ul>
      </div>
      <br>
      <br>

      <h5>Beslissing</h5>

      <div property="prov:value" datatype="xsd:string">
        <div property="eli:has_part" about="http://data.lblod.info/artikels/9176600b-2c48-4774-864d-c648c84b5232" typeof="besluit:Artikel">
          <div property="eli:number" datatype="xsd:string">Artikel 1</div>
          <span style="display:none;" property="eli:language" about="http://publications.europa.eu/resource/authority/language/NLD" typeof="skos:Concept">&nbsp;</span>
          <div property="prov:value" datatype="xsd:string">
            <span class="mark-highlight-manual">Voer inhoud in</span>
          </div>
        </div>
        <br>
        <div class="mark-highlight-manual"><span data-editor-highlight="true">Voeg nieuw artikel in</span></div> 
        <br>
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
  content: `<div property="prov:generated" about="http://my-example.org/besluit/2" typeof="http://data.vlaanderen.be/ns/besluit#Besluit http://mu.semte.ch/vocabularies/ext/BesluitNieuweStijl https://data.vlaanderen.be/id/concept/BesluitType/e96ec8af-6480-4b32-876a-fefe5f0a3793" data-editor-position-level="3" data-editor-rdfa-position-level="2"><span property="ext:hiddenBesluitType" class="u-hidden">https://data.vlaanderen.be/id/concept/BesluitType/e96ec8af-6480-4b32-876a-fefe5f0a3793</span>
      <p>Openbare titel besluit:</p>
      <h4 class="h4" property="eli:title" datatype="xsd:string">Title 2</h4>
      <span style="display:none;" property="eli:language" about="http://publications.europa.eu/resource/authority/language/NLD" typeof="skos:Concept">&nbsp;</span>
      <br>
      <p>Korte openbare beschrijving:</p>
      <p property="eli:description" datatype="xsd:string">Description 2</p>
      <br>

      <div property="besluit:motivering" lang="nl" data-editor-position-level="2" data-editor-rdfa-position-level="1">
        <p>
          <span class="mark-highlight-manual">geef bestuursorgaan op</span>,
        </p>
        <br>

        <h5 data-editor-position-level="1">Bevoegdheid</h5>
        <ul class="bullet-list"><li><span class="mark-highlight-manual">Rechtsgrond die bepaalt dat dit orgaan bevoegd is.</span></li></ul>
        <br>

        <h5>Juridische context</h5>
        <ul class="bullet-list"><li><span class="mark-highlight-manual">Voeg juridische context in</span></li></ul>
        <br>

        <h5>Feitelijke context en argumentatie</h5>
        <ul class="bullet-list"><li><span class="mark-highlight-manual">Voeg context en argumentatie in</span></li></ul>
      </div>
      <br>
      <br>

      <h5>Beslissing</h5>

      <div property="prov:value" datatype="xsd:string">
        <div property="eli:has_part" about="http://data.lblod.info/artikels/9176600b-2c48-4774-864d-c648c84b5232" typeof="besluit:Artikel">
          <div property="eli:number" datatype="xsd:string">Artikel 1</div>
          <span style="display:none;" property="eli:language" about="http://publications.europa.eu/resource/authority/language/NLD" typeof="skos:Concept">&nbsp;</span>
          <div property="prov:value" datatype="xsd:string">
            <span class="mark-highlight-manual">Voer inhoud in</span>
          </div>
        </div>
        <br>
        <div class="mark-highlight-manual"><span data-editor-highlight="true">Voeg nieuw artikel in</span></div> 
        <br>
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
        `http://my-example.org/files/${attachment1.fileUuid}/download?name=${attachment1.filename}`
      )
    );

    const attachment1ReverseQuad = factory.quad(
      factory.namedNode(
        `http://my-example.org/files/${attachment1.fileUuid}/download?name=${attachment1.filename}`
      ),
      factory.namedNode('dct:isPartOf'),
      factory.literal(
        'http://my-example.org/besluit/1',
        'http://www.w3.org/2001/XMLSchema#string'
      )
    );

    const attachment2Quad = factory.quad(
      factory.namedNode('http://my-example.org/besluit/1'),
      factory.namedNode('eli:related_to'),
      factory.namedNode(
        `http://my-example.org/files/${attachment2.fileUuid}/download?name=${attachment2.filename}`
      )
    );

    assert(dataset.has(attachment1Quad));
    //assert(dataset.has(attachment1ReverseQuad));
    //assert(dataset.has(attachment2Quad));
  });

  it('validates the basic shacl profile', async function () {
    const shacl = await loadDataset(__dirname + '/shapes/meeting.ttl');
    const validator = new SHACLValidator(shacl, { factory });
    const report = await validator.validate(this.dataset);
    assert(report.conforms, shaclReportToMessage(report));
  });
});
