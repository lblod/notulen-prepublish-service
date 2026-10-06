// @ts-nocheck
// @ts-strict-ignore

import { TurtleDoc } from '@nbittich/tortank-wasm';
import { html_to_rdfa } from '@nbittich/rdfa-wasm';
import { strict as assert } from 'assert';
import { before } from 'mocha';
import { setupHandleBars } from '../support/setup-handlebars.js';
import { constructHtmlForAgendaFromData } from '../support/agenda-utils.js';
import Meeting from '../models/meeting.js';
import AgendaPoint from '../models/agendapoint.js';
import { readFile } from 'fs/promises';

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

describe('agenda publication template', function () {
  before(async function () {
    setupHandleBars();
  });

  it('is the expected output', async function () {
    const rdfaString = html_to_rdfa(
      constructAgenda(),
      'http://my-example.org/',
      ''
    );
    const doc = TurtleDoc.parse(rdfaString);
    const expected = TurtleDoc.parse(
      await readFile('test/expected_output/agenda-publication.ttl', {
        encoding: 'utf8',
      })
    );

    const unexpected = doc.difference(expected);
    const missing = expected.difference(doc);

    assert(
      unexpected.isEmpty(),
      `Error: triple(s) constructed not in expected:\n ${unexpected.toJSONString()}`
    );
    assert(
      missing.isEmpty(),
      `Error: triple(s) expected not in constructed:\n ${missing.toJSONString()}`
    );
  });
});
