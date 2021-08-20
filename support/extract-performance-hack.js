import Treatment from '../models/treatment';
import AgendaPoint from '../models/agendapoint';
import Meeting from '../models/meeting';
import Vote from '../models/vote';
import Decision from '../models/decision';
import { query, update, sparqlEscapeUri} from 'mu';
import {prefixes} from "./prefixes";
import {fetchParticipationListForTreatment} from './query-utils';
import { editorDocumentFromUuid } from './editor-document';
import { PUBLISHER_TEMPLATES} from './setup-handlebars';
import validateMeeting from './validate-meeting';
import validateTreatment from './validate-treatment';
import VersionedExtract from '../models/versioned-behandeling';
import {handleVersionedResource} from './pre-importer';
import { performance } from 'perf_hooks';
import {prefixMap} from "../support/prefixes";
import Mandatee from "../models/mandatee";
import {constructHtmlForExtract} from "./extract-utils"

function findUnique(key, bindings){
  let result=[];
  bindings.forEach(bindingE => {
    if(bindingE[key]){
      if(!result.find(resultE=>{
        return resultE[key].value==bindingE[key].value
      })){
        result.push(bindingE);
      }
    }
  });
  return result;
}
export default async function extractPerformanceHack(treatment, meeting, isPublic = true, meetingErrors){
  
  const apUri = treatment.agendapoint;
  const resourceUri = treatment.uri;
  const presentPredicate = "besluit:heeftAanwezige";
  const absentPredicate = "ext:heeftAfwezige";
  const apParticipationVotesQuery = `

    ${prefixMap.get("besluit").toSparqlString()}
    ${prefixMap.get("mandaat").toSparqlString()}
    ${prefixMap.get("org").toSparqlString()}
    ${prefixMap.get("dct").toSparqlString()}
    ${prefixMap.get("foaf").toSparqlString()}
    ${prefixMap.get("schema").toSparqlString()}
    ${prefixMap.get("skos").toSparqlString()}
    ${prefixMap.get("persoon").toSparqlString()}
    ${prefixMap.get("ext").toSparqlString()}

    SELECT * WHERE {`+
      //AP QUERY
      `
      BIND(${sparqlEscapeUri(apUri)} as ?APuri)
      
      ?APuri besluit:geplandOpenbaar ?APplannedPublic.
      ?APuri dct:title ?APtitle.
      ?APuri schema:position ?APposition.
      OPTIONAL {
        ?APuri besluit:aangebrachtNa ?APaddedAfter.
      }
      OPTIONAL {
        ?APuri dct:description ?APdescription.
      }
      OPTIONAL {
        ?APuri <http://data.vlaanderen.be/ns/besluit#Agendapunt.type> ?APtype.
        ?APtype skos:prefLabel ?APtypeName.
      }`+
      //PRESENT PARTICIPANTS QUERY
      `
      OPTIONAL{
        ${sparqlEscapeUri(resourceUri)} ${presentPredicate} ?PPmandatarisUri.
        ?PPmandatarisUri mandaat:isBestuurlijkeAliasVan ?PPpersonUri.
        ?PPmandatarisUri org:holds ?PPpositionUri.
        ?PPpositionUri org:role ?PProleUri.
        ?PProleUri skos:prefLabel ?PProle.
        ?PPpersonUri foaf:familyName ?PPfamilyName.
        ?PPpersonUri persoon:gebruikteVoornaam ?PPname.
      }`+
      //NOT PRESENT PARTICIPANTS QUERY
      `
      OPTIONAL{
        ${sparqlEscapeUri(resourceUri)} ${absentPredicate} ?NPmandatarisUri.
        ?NPmandatarisUri mandaat:isBestuurlijkeAliasVan ?NPpersonUri.
        ?NPmandatarisUri org:holds ?NPpositionUri.
        ?NPpositionUri org:role ?NProleUri.
        ?NProleUri skos:prefLabel ?NProle.
        ?NPpersonUri foaf:familyName ?NPfamilyName.
        ?NPpersonUri persoon:gebruikteVoornaam ?NPname.
      }`+
      //CHAIRMAN QUERY
      `
      OPTIONAL {
        ${sparqlEscapeUri(resourceUri)} besluit:heeftVoorzitter ?CHchairmanUri.
        ?CHchairmanUri mandaat:isBestuurlijkeAliasVan ?CHchairmanPersonUri.
        ?CHchairmanUri org:holds ?CHchairmanRoleUri.
        ?CHchairmanRoleUri org:role ?CHchairmanBestuursfunctieCodeUri.
        ?CHchairmanBestuursfunctieCodeUri skos:prefLabel ?CHchairmanRole.
        ?CHchairmanPersonUri foaf:familyName ?CHchairmanFamilyName.
        ?CHchairmanPersonUri persoon:gebruikteVoornaam ?CHchairmanName.
      }`+
      //SECRETARY QUERY
      `
      OPTIONAL {
        ${sparqlEscapeUri(resourceUri)} besluit:heeftSecretaris ?SEsecretaryUri.
        ?SEsecretaryUri mandaat:isBestuurlijkeAliasVan ?SEsecretaryPersonUri.
        ?SEsecretaryUri org:holds ?SEsecretaryRoleUri.
        ?SEsecretaryRoleUri org:role ?SEsecretaryBestuursfunctieCodeUri.
        ?SEsecretaryBestuursfunctieCodeUri skos:prefLabel ?SEsecretaryRole.
        ?SEsecretaryPersonUri foaf:familyName ?SEsecretaryFamilyName.
        ?SEsecretaryPersonUri persoon:gebruikteVoornaam ?SEsecretaryName.
      }`+
      //VOTES QUERY
      `
      OPTIONAL{
        ${sparqlEscapeUri(resourceUri)} a besluit:BehandelingVanAgendapunt;
          besluit:heeftStemming ?VOuri.
        ?VOuri a besluit:Stemming.
        ?VOuri besluit:onderwerp ?VOsubject.
        ?VOuri besluit:gevolg ?VOresult.
        ?VOuri besluit:aantalVoorstanders ?VOpositiveVotes.
        ?VOuri besluit:aantalTegenstanders ?VOnegativeVotes.
        ?VOuri besluit:aantalOnthouders ?VOabstentionVotes.
        ?VOuri besluit:geheim ?VOisSecret.
        ${sparqlEscapeUri(resourceUri)} dct:subject ?VOagendapuntUri.
        ?VOzittingUri besluit:behandelt ?VOagendapuntUri.
        ?VOzittingUri besluit:isGehoudenDoor ?VOadminBodyUri.
        ?VOadminBodyUri mandaat:isTijdspecialisatieVan ?VOmainBestuursorgaanUri.
        ?VOmainBestuursorgaanUri besluit:classificatie ?VOadminBodyClassification.
        OPTIONAL { 
          ?VOuri schema:position ?VOposition. 
        }`+
        //VOTES PARTICIPANTS QUERY
        `
        OPTIONAL{
          ?VOuri besluit:heeftAanwezige ?VPmandatarisUri.
          ?VPmandatarisUri mandaat:isBestuurlijkeAliasVan ?VPpersonUri.
          ?VPmandatarisUri org:holds ?VPpositionUri.
          ?VPpositionUri org:role ?VProleUri.
          ?VProleUri skos:prefLabel ?VProle.
          ?VPpersonUri foaf:familyName ?VPfamilyName.
          ?VPpersonUri persoon:gebruikteVoornaam ?VPname.
        }`+
        //VOTERS QUERY
        `
        OPTIONAL{
          ?VOuri besluit:heeftStemmer ?VSmandatarisUri.
          ?VSmandatarisUri mandaat:isBestuurlijkeAliasVan ?VSpersonUri.
          ?VSmandatarisUri org:holds ?VSpositionUri.
          ?VSpositionUri org:role ?VSroleUri.
          ?VSroleUri skos:prefLabel ?VSrole.
          ?VSpersonUri foaf:familyName ?VSfamilyName.
          ?VSpersonUri persoon:gebruikteVoornaam ?VSname.
        }`+
        //POSITIVE VOTERS QUERY
        `
        OPTIONAL{
          ?VOuri besluit:heeftVoorstander ?PVmandatarisUri.
          ?PVmandatarisUri mandaat:isBestuurlijkeAliasVan ?PVpersonUri.
          ?PVmandatarisUri org:holds ?PVpositionUri.
          ?PVpositionUri org:role ?PVroleUri.
          ?PVroleUri skos:prefLabel ?PVrole.
          ?PVpersonUri foaf:familyName ?PVfamilyName.
          ?PVpersonUri persoon:gebruikteVoornaam ?PVname.
        }`+
        //NEGATIVE VOTERS QUERY
        `
        OPTIONAL{
          ?VOuri besluit:heeftTegenstander ?NVmandatarisUri.
          ?NVmandatarisUri mandaat:isBestuurlijkeAliasVan ?NVpersonUri.
          ?NVmandatarisUri org:holds ?NVpositionUri.
          ?NVpositionUri org:role ?NVroleUri.
          ?NVroleUri skos:prefLabel ?NVrole.
          ?NVpersonUri foaf:familyName ?NVfamilyName.
          ?NVpersonUri persoon:gebruikteVoornaam ?NVname.
        }`+
        //ABSENTEE VOTERS QUERY
        `
        OPTIONAL{
          ?VOuri besluit:heeftOnthouder ?AVmandatarisUri.
          ?AVmandatarisUri mandaat:isBestuurlijkeAliasVan ?AVpersonUri.
          ?AVmandatarisUri org:holds ?AVpositionUri.
          ?AVpositionUri org:role ?AVroleUri.
          ?AVroleUri skos:prefLabel ?AVrole.
          ?AVpersonUri foaf:familyName ?AVfamilyName.
          ?AVpersonUri persoon:gebruikteVoornaam ?AVname.
        }
      }
    }
  `;
  
  let apAndParticipationVotesResult;
  try {
    apAndParticipationVotesResult=await query(apParticipationVotesQuery);
  } catch (error) {
    debugger;
  }

  //CREATE AP OBJECT
  const apBindings=apAndParticipationVotesResult.results.bindings;
  const firstApBinding=apAndParticipationVotesResult.results.bindings[0];
  
  const agendapointTest=new AgendaPoint({
    uri: firstApBinding.APuri.value,
    title: firstApBinding.APtitle.value,
    position: firstApBinding.APposition.value,
    plannedPublic: firstApBinding.APplannedPublic.value === "true",
    addedAfter: firstApBinding.APaddedAfter?.value,
    description: firstApBinding.APdescription?.value,
    type: firstApBinding.APtype?.value,
    typeName: firstApBinding.APtypeName?.value
  });

  //CREATE PRESENT PARTICIPANT OBJECTS
  const uniquePP=findUnique('PPmandatarisUri', apBindings);  
  const present=uniquePP.map(ppE=>{
    const binding={
      mandatarisUri: ppE.PPmandatarisUri,
      personUri: ppE.PPpersonUri,
      name: ppE.PPname,
      familyName: ppE.PPfamilyName,
      role: ppE.PProle,
      roleUri: ppE.PProleUri,
      positionUri: ppE.PPpositionUri
    };
    return new Mandatee(binding);
  });

  //CREATE ABSENT PARTICIPANT OBJECTS
  const uniqueNP=findUnique('NPmandatarisUri', apBindings);  
  const notPresent=uniqueNP.map(npE=>{
    const binding={
      mandatarisUri: npE.NPmandatarisUri,
      personUri: npE.NPpersonUri,
      name: npE.NPname,
      familyName: npE.NPfamilyName,
      role: npE.NProle,
      roleUri: npE.NProleUri,
      positionUri: npE.NPpositionUri
    };
    return new Mandatee(binding);
  });

  //CREATE CHAIRMAN OBJECT
  const uniqueCH=findUnique('CHchairmanUri', apBindings)[0];  
  
  let chairman;
  if(uniqueCH?.CHchairmanUri) {
    chairman = {
      uri: uniqueCH.CHchairmanUri.value,
      personUri: uniqueCH.CHchairmanPersonUri.value,
      name: uniqueCH.CHchairmanName.value,
      familyName: uniqueCH.CHchairmanFamilyName.value,
      roleUri: uniqueCH.CHchairmanRoleUri.value,
      role: uniqueCH.CHchairmanRole.value
    };
  }

  //CREATE SECRETARY OBJECT
  const uniqueSE=findUnique('SEsecretaryUri', apBindings)[0];  
  
  let secretary;
  if(uniqueSE?.SEsecretaryUri) {
    secretary = {
      uri: uniqueSE.SEsecretaryUri.value,
      personUri: uniqueSE.SEsecretaryPersonUri.value,
      name: uniqueSE.SEsecretaryName.value,
      familyName: uniqueSE.SEsecretaryFamilyName.value,
      roleUri: uniqueSE.SEsecretaryRoleUri.value,
      role: uniqueSE.SEsecretaryRole.value
    };
  }

  let participationListTest;
  
  if(present.length || notPresent.length || chairman || secretary) {
    participationListTest={present, notPresent, chairman, secretary};
  } else {
    participationListTest=undefined;
  }

  //CREATE VOTE OBJECT
  const uniqueVO=findUnique('VOuri', apBindings);
  const votesTest=uniqueVO.map(uniqueVOE=>{
    return new Vote({
      uri: uniqueVOE.VOuri.value,
      subject: uniqueVOE.VOsubject.value,
      result: uniqueVOE.VOresult.value,
      isSecret: uniqueVOE.VOisSecret.value === "true",
      positiveVotes: uniqueVOE.VOpositiveVotes.value,
      negativeVotes: uniqueVOE.VOnegativeVotes.value,
      abstentionVotes: uniqueVOE.VOabstentionVotes.value,
      position: uniqueVOE.VOposition?.value,
      adminBodyClassification: uniqueVOE.VOadminBodyClassification?.value
    });
  });

  //CREATE VOTES PARTICIPANT OBJECTS
  const uniqueVP=findUnique('VPmandatarisUri', apBindings);
  votesTest.forEach(voE=>{
    const filteredUniqueVP=uniqueVP.filter(vpE=>vpE.VOuri.value==voE.uri);
    const voteParticipants=filteredUniqueVP.map(vpE=>{
      const binding={
        mandatarisUri: vpE.VPmandatarisUri,
        personUri: vpE.VPpersonUri,
        name: vpE.VPname,
        familyName: vpE.VPfamilyName,
        role: vpE.VProle,
        roleUri: vpE.VProleUri,
        positionUri: vpE.VPpositionUri
      };
      return new Mandatee(binding);
    });
    voE.attendees=voteParticipants;
  });

  //CREATE VOTERS OBJECTS
  const uniqueVS=findUnique('VSmandatarisUri', apBindings);
  votesTest.forEach(voE=>{
    const filteredUniqueVS=uniqueVS.filter(vsE=>vsE.VOuri.value==voE.uri);
    const voteParticipants=filteredUniqueVS.map(vsE=>{
      const binding={
        mandatarisUri: vsE.VSmandatarisUri,
        personUri: vsE.VSpersonUri,
        name: vsE.VSname,
        familyName: vsE.VSfamilyName,
        role: vsE.VSrole,
        roleUri: vsE.VSroleUri,
        positionUri: vsE.VSpositionUri
      };
      return new Mandatee(binding);
    });
    voE.voters=voteParticipants;
  });
  
  //CREATE POSITIVE VOTERS OBJECTS
  const uniquePV=findUnique('PVmandatarisUri', apBindings);
  votesTest.forEach(voE=>{
    const filteredUniquePV=uniquePV.filter(pvE=>pvE.VOuri.value==voE.uri);
    const voteParticipants=filteredUniquePV.map(pvE=>{
      const binding={
        mandatarisUri: pvE.PVmandatarisUri,
        personUri: pvE.PVpersonUri,
        name: pvE.PVname,
        familyName: pvE.PVfamilyName,
        role: pvE.PVrole,
        roleUri: pvE.PVroleUri,
        positionUri: pvE.PVpositionUri
      };
      return new Mandatee(binding);
    });
    voE.positiveVoters=voteParticipants;
  });

  //CREATE NEGATIVE VOTERS OBJECTS
  const uniqueNV=findUnique('NVmandatarisUri', apBindings);
  votesTest.forEach(voE=>{
    const filteredUniqueNV=uniqueNV.filter(nvE=>nvE.VOuri.value==voE.uri);
    const voteParticipants=filteredUniqueNV.map(nvE=>{
      const binding={
        mandatarisUri: nvE.NVmandatarisUri,
        personUri: nvE.NVpersonUri,
        name: nvE.NVname,
        familyName: nvE.NVfamilyName,
        role: nvE.NVrole,
        roleUri: nvE.NVroleUri,
        positionUri: nvE.NVpositionUri
      };
      return new Mandatee(binding);
    });
    voE.negativeVoters=voteParticipants;
  });

  //CREATE ABSENTEE VOTERS OBJECTS
  const uniqueAV=findUnique('AVmandatarisUri', apBindings);
  votesTest.forEach(voE=>{
    const filteredUniqueAV=uniqueAV.filter(avE=>avE.VOuri.value==voE.uri);
    const voteParticipants=filteredUniqueAV.map(avE=>{
      const binding={
        mandatarisUri: avE.AVmandatarisUri,
        personUri: avE.AVpersonUri,
        name: avE.AVname,
        familyName: avE.AVfamilyName,
        role: avE.AVrole,
        roleUri: avE.AVroleUri,
        positionUri: avE.AVpositionUri
      };
      return new Mandatee(binding);
    });
    voE.abstentionVoters=voteParticipants;
  });
  








  // const agendapoint = await AgendaPoint.findURI(treatment.agendapoint);
  // const participationList = await fetchParticipationListForTreatment(treatment.uri);
  // const votes = await Vote.findAll({treatmentUri: treatment.uri});
  // await Promise.all(votes.map((vote) => vote.fetchVoters()));
  
  const agendapoint=agendapointTest;
  const participationList=participationListTest;
  const votes=votesTest;
  
  let content;
  if (isPublic) {
    const document = await editorDocumentFromUuid(treatment.editorDocumentUuid, treatment.attachments);
    content = document?.content ?? "";
  }
  else {
    const decisions = await Decision.extractDecisionsFromDocument(treatment.editorDocumentUuid);
    const template =  PUBLISHER_TEMPLATES.get('decisionsTitleAndDescriptionOnly');
    content = template({decisions});
  }

  const data={treatment, agendapoint, meeting, prefixes: prefixes.join(" "), participationList, votes, content};

  const html = constructHtmlForExtract(data);

  const treatmentErrors = await validateTreatment(treatment);

  return {
    data: {
      attributes: {
        content: html,
        errors: [...meetingErrors, ...treatmentErrors],
        behandeling: treatment.uri,
        uuid: treatment.uuid
      }
    }
  };

}