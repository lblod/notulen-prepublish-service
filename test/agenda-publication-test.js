import  { strict  as assert } from 'assert';
import { constructHtmlForAgendaFromData } from '../support/agenda-utils';
import Meeting from '../models/meeting';
import AgendaPoint from '../models/agendapoint';

import { parse, loadDataset, htmlToRdf, shaclReportToMessage } from './helpers';
import factory from '@rdfjs/dataset';
import SHACLValidator from 'rdf-validate-shacl';

const meeting = new Meeting({
  uri: "http://my-example.org/meeting/uuid",
  plannedStart: "2021-05-01T15:00:00Z",
  adminBodyUri: "http://my-example.org/bestuursorgaan/uuid",
  adminBodyName: "bestuursorgaan"
});

const agendapoint1 = new AgendaPoint({
  uri: "http://my-example.org/agendapoints/1234",
  title: "agendapoint 1",
  plannedPublic: true,
  type: "http://my-example.org/agendapoint-type/1",
  typeName: "gepland",
  position: 1
});
const agendapoint2 = new AgendaPoint({
  uri: "http://my-example.org/agendapoints/1235",
  title: "agendapoint 2",
  addedAfter: "http://my-example.org/agendapoints/1234",
  plannedPublic: true,
  type: "http://my-example.org/agendapoint-type/1",
  typeName: "gepland",
  position: 2
});
function constructAgenda() {
  const agendapoints = [ agendapoint1, agendapoint2];
  const html = constructHtmlForAgendaFromData(meeting, agendapoints);
  return html;
}

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
describe('agenda publication template', function () {
  it('has the expected administrative body linked to the meeting', async function() {
    const html = constructHtmlForAgendaFromData(meeting, []);
    const dataset = await htmlToRdf(html);
    const adminBodyQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#isGehoudenDoor"),
      factory.namedNode(meeting.adminBodyUri)
    );
    assert(dataset.has(adminBodyQuad));
  });
  it('has the expected zitting type', async function() {
    const html = constructHtmlForAgendaFromData(meeting, []);
    const dataset = await htmlToRdf(html);
    const typeQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#Zitting")
    );
    assert(dataset.has(typeQuad));
  });
  it('has the correct planned start date', async function() {
    const html = constructHtmlForAgendaFromData(meeting, []);
    const dataset = await htmlToRdf(html);
    const plannedStartQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#geplandeStart"),
      factory.literal(meeting.plannedStart, "http://www.w3.org/2001/XMLSchema#dateTime")
    );
    assert(dataset.has(plannedStartQuad), "expected planned start");
  });

  it('has agendapoint 2 correctly linking to agendapoint1', async function() {
    const dataset = await htmlToRdf(constructAgenda());
    const addedAfterQuad = factory.quad(
      factory.namedNode(agendapoint2.uri),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#aangebrachtNa"),
      factory.namedNode(agendapoint1.uri)
    );
    assert(dataset.has(addedAfterQuad));
  });

  it('has the correct title for agendapoint 1', async function () {
    const dataset = await htmlToRdf(constructAgenda());
    const titleQuad = factory.quad(
      factory.namedNode(agendapoint1.uri),
      factory.namedNode("http://purl.org/dc/terms/title"),
      factory.literal(agendapoint1.title)
    );
    assert(dataset.has(titleQuad));
  });

  it('validates the basic shacl profile', async function(){
    const shacl = await loadDataset(__dirname + "/shapes/basic-agenda.ttl");
    const validator = new SHACLValidator(shacl, { factory });
    const triples = await htmlToRdf(constructAgenda());
    const report = await validator.validate(triples);
    assert(report.conforms, shaclReportToMessage(report));
  });
});
