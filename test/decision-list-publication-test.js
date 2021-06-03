import { strict as assert } from 'assert';
import { before } from 'mocha';
import { setupHandleBars } from '../support/setup-handlebars';
import { constructHtmlForDecisionList } from '../support/besluit-exporter';
import Meeting from '../models/meeting';
import Treatment from '../models/treatment';
import Decision from '../models/decision';
import { loadDataset, htmlToRdf, shaclReportToMessage } from './helpers';
import factory from '@rdfjs/dataset';
import SHACLValidator from 'rdf-validate-shacl';

const meeting = new Meeting({
  uri: "http://my-example.org/meeting/uuid",
  plannedStart: "2021-05-01T15:00:00Z",
  startedAt: "2021-05-01T15:00:00Z",
  endedAt: "2021-05-01T18:00:00Z",
  adminBodyUri: "http://my-example.org/bestuursorgaan/uuid",
  adminBodyName: "bestuursorgaan"
});

const treatment1 = new Treatment({
  uri: "http://my-example.org/behandeling/1",
  isPublic: true,
  position: 0,
  meeting: meeting.uri,
  agendapoint: "http://my-example.org/agendapoints/1"
});

const decision1 = new Decision({
  uri: "http://my-example.org/decisions/2",
  title: "decision 2",
  types: ["besluit:Besluit"]
});

const decision2 = new Decision({
  uri: "http://my-example.org/decisions/1",
  title: "decision 1",
  types: ["besluit:Besluit"]
});

treatment1.decisions = [decision1];
const treatment2 = new Treatment({
  uri: "http://my-example.org/behandeling/2",
  isPublic: true,
  position: 0,
  meeting: meeting.uri,
  agendapoint: "http://my-example.org/agendapoints/2",
  executedAfter: treatment1.uri
});

treatment2.decisions = [decision2];
treatment2.votes = [
  {
    uri: "http://my-example.org/votes/1",
    subject: "subject 1",
    result: "goedgekeurd"
  }
];

const decisionList = [treatment1, treatment2];

function constructDecisionList() {
  const html = constructHtmlForDecisionList(meeting, decisionList);
  return html;
}

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

describe('decision list publication template', function() {
  before(async function() {
    setupHandleBars();
    const html = constructDecisionList();
    console.log(html);
    this.dataset = await htmlToRdf(html);
  });

  it('has the expected administrative body linked to the meeting', function() {
    const adminBodyQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#isGehoudenDoor"),
      factory.namedNode(meeting.adminBodyUri)
    );
    assert(this.dataset.has(adminBodyQuad));
  });
  it('has the expected zitting type', function() {
    const typeQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#Zitting")
    );
    assert(this.dataset.has(typeQuad));
  });
  it('has the correct planned start date', function() {
    const plannedStartQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#geplandeStart"),
      factory.literal(meeting.plannedStart, "http://www.w3.org/2001/XMLSchema#dateTime")
    );
    assert(this.dataset.has(plannedStartQuad));
  });

  it('has the correct start date', function() {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode("http://www.w3.org/ns/prov#startedAtTime"),
      factory.literal(meeting.startedAt, "http://www.w3.org/2001/XMLSchema#dateTime")
    );
    assert(this.dataset.has(startQuad));
  });

  it('has the correct end date', function() {
    const startQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode("http://www.w3.org/ns/prov#endedAtTime"),
      factory.literal(meeting.endedAt, "http://www.w3.org/2001/XMLSchema#dateTime")
    );
    assert(this.dataset.has(startQuad));
  });

  it('includes decision1', function() {
    const startQuad = factory.quad(
      factory.namedNode(decision1.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#Besluit")
    );
    assert(this.dataset.has(startQuad));
  });

  it('includes decision2', function() {
    const startQuad = factory.quad(
      factory.namedNode(decision2.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#Besluit")
    );
    assert(this.dataset.has(startQuad));
  });
  it('validates the basic shacl profile', async function() {
    const shacl = await loadDataset(__dirname + "/shapes/decision-list.ttl");
    const validator = new SHACLValidator(shacl, { factory });
    const report = await validator.validate(this.dataset);
    assert(report.conforms, shaclReportToMessage(report));
  });
});
