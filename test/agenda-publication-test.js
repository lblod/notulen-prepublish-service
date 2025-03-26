// @ts-nocheck
// @ts-strict-ignore

import { strict as assert, equal } from 'assert';
import { before } from 'mocha';
import { setupHandleBars } from '../support/setup-handlebars.js';
import { constructHtmlForAgendaFromData } from '../support/agenda-utils.js';
import Meeting from '../models/meeting.js';
import AgendaPoint from '../models/agendapoint.js';
import { loadDataset, htmlToRdf, shaclReportToMessage } from './helpers.js';
import factory from '@rdfjs/dataset';
import SHACLValidator from 'rdf-validate-shacl';
import path from 'path';

const meeting = new Meeting({
  uri: 'http://my-example.org/meeting/uuid',
  plannedStart: '2021-05-01T15:00:00Z',
  adminBodyUri: 'http://my-example.org/bestuursorgaan/uuid',
  adminBodyName: 'bestuursorgaan',
});

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
  addedAfter: 'http://my-example.org/agendapoints/1234',
  plannedPublic: true,
  type: 'http://my-example.org/agendapoint-type/1',
  typeName: 'gepland',
  description: 'a description for agendapoint 2',
  position: 2,
});
function constructAgenda() {
  const agendapoints = [agendapoint1, agendapoint2];
  const html = constructHtmlForAgendaFromData(meeting, agendapoints);
  return html;
}

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
describe('agenda publication template', function () {
  before(async function () {
    setupHandleBars();
    this.dataset = await htmlToRdf(constructAgenda());
  });

  it('has triples', function () {
    assert(this.dataset.size > 0);
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
    assert(this.dataset.has(plannedStartQuad), 'expected planned start');
  });

  it('has agendapoint 2 correctly linking to agendapoint1', function () {
    const addedAfterQuad = factory.quad(
      factory.namedNode(agendapoint2.uri),
      factory.namedNode('http://data.vlaanderen.be/ns/besluit#aangebrachtNa'),
      factory.namedNode(agendapoint1.uri)
    );
    assert(this.dataset.has(addedAfterQuad));
  });

  it('has the correct title for agendapoint 1', function () {
    const titleQuad = factory.quad(
      factory.namedNode(agendapoint1.uri),
      factory.namedNode('http://purl.org/dc/terms/title'),
      factory.literal(agendapoint1.title)
    );
    assert(this.dataset.has(titleQuad));
  });

  it('doesnt include a description for agendapoint 1', function () {
    const datasetMatches = this.dataset.match(
      factory.namedNode(agendapoint1.uri),
      factory.namedNode('http://purl.org/dc/terms/description'),
      null
    );
    equal(datasetMatches.size, 0);
  });

  it('has the correct description for agendapoint 2', function () {
    const addedAfterQuad = factory.quad(
      factory.namedNode(agendapoint2.uri),
      factory.namedNode('http://purl.org/dc/terms/description'),
      factory.literal(agendapoint2.description)
    );
    assert(this.dataset.has(addedAfterQuad));
  });

  it('validates the basic shacl profile', async function () {
    const shacl = await loadDataset(path.resolve('test/shapes/basic-agenda.ttl'));
    const validator = new SHACLValidator(shacl, { factory });
    const report = await validator.validate(this.dataset);
    assert(report.conforms, shaclReportToMessage(report));
  });
});
