import  { strict  as assert, equal } from 'assert';
import { before } from 'mocha';
import { setupHandleBars } from '../support/setup-handlebars';
import { constructHtmlForAgendaFromData } from '../support/agenda-utils';
import Meeting from '../models/meeting';
import AgendaPoint from '../models/agendapoint';
import { loadDataset, htmlToRdf, shaclReportToMessage } from './helpers';
import factory from '@rdfjs/dataset';
import SHACLValidator from 'rdf-validate-shacl';

async function constructNotulen() {
  // TODO
}

describe('notulen publication template', function() {
  before(async function() {
    setupHandleBars();
    this.dataset = await htmlToRdf(constructNotulen());
  });
  it('has triples', function() {
    assert(this.dataset.size > 0);
  });

  it('has the expected zitting type', function() {
    const typeQuad = factory.quad(
      factory.namedNode(meeting.uri),
      factory.namedNode(RDF_TYPE),
      factory.namedNode("http://data.vlaanderen.be/ns/besluit#Zitting")
    );
    assert(this.dataset.has(typeQuad));
  });

  it('validates the basic shacl profile', async function(){
    const shacl = await loadDataset(__dirname + "/shapes/notulen.ttl");
    const validator = new SHACLValidator(shacl, { factory });
    const report = await validator.validate(this.dataset);
    assert(report.conforms, shaclReportToMessage(report));
  });
})
