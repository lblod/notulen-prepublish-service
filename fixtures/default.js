/**
 * This file contains some default fixtures which may be used for
 * simple testing.  Content of these tests is fairly random.
 */
export default {
  aanstelling: `<div class="annotation-snippet" resource="http://data.lblod.info/aanstellingsbesluiten/37270eed-cfa5-46cd-a2e9-44f6ed65f72f" typeof="mandaat:AanstellingsBesluit">
      <div class="annotation-structure">
        <h5 class="h4 u-spacer" property="eli:title">
          Mededeling benoeming en eedaflegging
        </h5>
        <meta property="eli:language" resource="http://publications.europa.eu/resource/authority/language/NLD">
      </div>

      <div property="besluit:motivering" xml:lang="nl">
        <div class="annotation-structure annotation-structure--active">
          <h6 class="h5">Feiten en context</h6>
          <ul class="bullet-list bullet-list--spaced--small u-spacer">
            <li>Gelet op </li>
          </ul>
        </div>
        <div class="annotation-structure">
          <h6 class="h5">Juridische gronden</h6>
          <ul class="bullet-list bullet-list--spaced--small u-spacer">
            <li>Gelet op <a class="annotation" href="http://codex.opendata.api.vlaanderen.be/api/WetgevingDocument/1013949" property="eli:cites">Decreet Gemeentedecreet</a></li>
          </ul>
        </div>
      </div>

      <div class="annotation-structure">
        <h6 class="h5">Besluit</h6>
        <ol class="li--besluit u-spacer" property="prov:value">
          <li property="eli:has_part" resource="http://data.lblod.info/artikels/8249f68a-6dcd-41a2-997f-14a3aa38e07a" typeof="besluit:Artikel">
            <div class="grid">
              <div class="col--3-12">
                <span class="annotation" property="eli:number">Enig artikel.</span>
              </div>
              <div class="col--9-12">
                <meta property="eli:language" resource="http://publications.europa.eu/resource/authority/language/NLD">                    
                <div class="annotation" property="prov:value">
                  De gemeenteraad neemt kennis van de eedaflegging door en benoeming van <span class="annotation" property="mandaat:bekrachtigtAanstellingVan" resource="https://data.lblod.info/id/mandatarissen/5A3CC83DF1C8F4000A000004" typeof="mandaat:Mandataris">
         Felix Ruiz de Arcaute (developer)
       </span> met ingang van <span class="annotation" property="mandaat:start" datatype="xsd:date" content="2017-01-20">20 januari 2017</span>.
                </div>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div><br>​​`,
  langeAanstelling: `<div vocab="http://data.vlaanderen.be/ns/besluit#" prefix="eli: http://data.europa.eu/eli/ontology# prov: http://www.w3.org/ns/prov# mandaat: http://data.vlaanderen.be/ns/mandaat# besluit: http://data.vlaanderen.be/ns/besluit#" resource="#" typeof="foaf:Document" class="app-view">
  <div id="pickme">
    <div id="ember279" class="editor-grid ember-view"><div id="ember298" class="toolbar grid ember-view"><div class="col--8-12 toolbar__styling-tools">
  <div class="button-group u-display-inline-block">
<button id="ember303" class="button button--alt button--small button--narrow ember-view">        Zoom 125% <i class="fa fa-angle-down"></i>


<!----></button><button id="ember304" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-paste"></i>


<!----></button><button id="ember305" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-copy"></i>


<!----></button><button id="ember306" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-scissors"></i>


<!----></button>  </div>
  <div class="button-group u-display-inline-block">
<button id="ember307" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-rotate-left"></i>


<!----></button><button id="ember308" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-rotate-right"></i>


<!----></button>  </div>
  <div class="button-group u-display-inline-block">
<button id="ember309" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-list-ul"></i>


<!----></button><button id="ember310" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-list-ol"></i>


<!----></button><button id="ember311" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-indent"></i>


<!----></button><button id="ember312" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-dedent"></i>


<!----></button>  </div>
  <div class="button-group u-display-inline-block">
<button id="ember313" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-link"></i>


<!----></button><button id="ember314" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-table"></i>


<!----></button>  </div>
  <div class="button-group u-display-inline-block">
<button id="ember315" class="button button--narrow button--link button--dark button--link--dark ember-view">        <i class="fa fa-code"></i>


<!----></button>  </div>
</div>
<div class="col--4-12 u-align-right">
  <div class="button-group">
    <div class="checkbox--switch__wrapper checkbox--switch--small">
      <input id="toggle-1" name="toggle" value="" checked="checked" class="checkbox--switch" type="checkbox">
      <label for="toggle-1" class="checkbox--switch__label"></label>
      <span>Toon annotaties</span>
    </div>
    <button id="ember316" class="button button--alt button--alt--blue button--small button--narrow ember-view"><!---->  Voeg annotatie in +

<!----></button>
  </div>
</div>


</div>

<div class="grid editor-container">
  <div id="ember319" class="sidebar col--3-12 ember-view"><div class="sidebar__header">
  <h6 class="h6">Document structuur</h6>
</div>
<div class="sidebar__content">
  <div class="side-navigation">
	  <ul class="side-navigation__group">
		  <li class="side-navigation__item"><a href="#title">Titel</a></li>
		  <li class="side-navigation__item"><a href="#content-2" class="active">Datum</a></li>
		  <li class="side-navigation__item"><a href="#content-3">Aanwezigen</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
		  <li class="side-navigation__item"><a href="#content-4">Content</a></li>
	  </ul>
  </div>
</div>
<div class="sidebar__footer">
  <button id="ember320" class="button button--block ember-view"><!---->  Voeg tekst element in

  <span class="button__command button__command--below">ctrl + n</span>
</button>
</div>




</div>
	<div class="editor col--9-12">
		<div class="grid">
			<div class="col--7-12">
<div id="ember323" class="editor__paper ember-view" contenteditable="true"><div class="annotation-snippet" resource="http://data.lblod.info/aanstellingsbesluiten/411b0a87-5e93-4a92-b65e-ccbd4ee02553" typeof="mandaat:AanstellingsBesluit">
      <div class="annotation-structure">
        <h5 class="h4 u-spacer" property="eli:title">
          Mededeling benoeming en eedaflegging
        </h5>
        <meta property="eli:language" resource="http://publications.europa.eu/resource/authority/language/NLD">
      </div>

      <div property="besluit:motivering" xml:lang="nl">
        <div class="annotation-structure annotation-structure--active">
          <h6 class="h5">Feiten en context</h6>
          <ul class="bullet-list bullet-list--spaced--small u-spacer">
            <li>Gelet op </li>
          </ul>
        </div>
        <div class="annotation-structure">
          <h6 class="h5">Juridische gronden</h6>
          <ul class="bullet-list bullet-list--spaced--small u-spacer">
            <li>Gelet op <a class="annotation" href="http://codex.opendata.api.vlaanderen.be/api/WetgevingDocument/1013949" property="eli:cites">Decreet Gemeentedecreet</a></li>
          </ul>
        </div>
      </div>

      <div class="annotation-structure">
        <h6 class="h5">Besluit</h6>
        <ol class="li--besluit u-spacer" property="prov:value">
          <li property="eli:has_part" resource="http://data.lblod.info/artikels/e61b6892-9067-47e9-a12b-3e7a0e44708c" typeof="besluit:Artikel">
            <div class="grid">
              <div class="col--3-12">
                <span class="annotation" property="eli:number">Enig artikel.</span>
              </div>
              <div class="col--9-12">
                <meta property="eli:language" resource="http://publications.europa.eu/resource/authority/language/NLD">                    
                <div class="annotation" property="prov:value">
                  De gemeenteraad neemt kennis van de eedaflegging door en benoeming van&nbsp;<span class="annotation" property="mandaat:bekrachtigtAanstellingVan" resource="https://data.lblod.info/id/mandatarissen/5A4CFFF9F1C8F40009000005" typeof="mandaat:Mandataris">
         Erika Pauw (Faker)
       </span> met ingang van <span class="annotation" property="mandaat:start" datatype="xsd:date" content="2018-12-20">20 december 2018</span>.
                </div>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>          

&nbsp;
</div>      		</div>
			<div class="col--5-12">
				<div class="editor-hints">
<!---->					
				</div>
			</div>
		</div>
  </div>
</div>
</div>
 </div>
  </div>`,
  notuleNiel: `<html class="bgsizecover flexbox objectfit object-fit js" data-ember-extension="1"><head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Demo editor</title>
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    
<meta name="demo-editor/config/environment" content="%7B%22modulePrefix%22%3A%22demo-editor%22%2C%22environment%22%3A%22production%22%2C%22rootURL%22%3A%22/%22%2C%22locationType%22%3A%22auto%22%2C%22EmberENV%22%3A%7B%22FEATURES%22%3A%7B%7D%2C%22EXTEND_PROTOTYPES%22%3A%7B%22Date%22%3Afalse%7D%7D%2C%22APP%22%3A%7B%22ember-rdfa-editor-date-plugin%22%3A%7B%22allowedInputDateFormats%22%3A%5B%22DD/MM/YYYY%22%2C%22DD-MM-YYYY%22%2C%22DD.MM.YYYY%22%5D%2C%22outputDateFormat%22%3A%22D%20MMMM%20YYYY%22%2C%22moment%22%3A%7B%22includeLocales%22%3A%5B%22nl%22%5D%7D%7D%2C%22name%22%3A%22demo-editor%22%2C%22version%22%3A%220.2.1+71c749d3%22%7D%2C%22moment%22%3A%7B%22outputFormat%22%3A%22DD-MM-YYYY%20hh%3Amm%3Ass%22%2C%22includeTimezone%22%3A%22all%22%2C%22includeLocales%22%3A%5B%22nl%22%5D%7D%2C%22exportApplicationGlobal%22%3Afalse%2C%22allowedInputDateFormats%22%3A%5B%22DD/MM/YYYY%22%2C%22DD-MM-YYYY%22%2C%22DD.MM.YYYY%22%5D%2C%22outputDateFormat%22%3A%22D%20MMMM%20YYYY%22%7D">

        <link href="//dij151upo6vad.cloudfront.net/2.6.0/css/vlaanderen-ui.css" rel="stylesheet" type="text/css">
        <link href="//dij151upo6vad.cloudfront.net/2.6.0/css/vlaanderen-ui-corporate.css" rel="stylesheet" type="text/css">

    <link integrity="" rel="stylesheet" href="/assets/vendor-8bcda1dbc594a1e81f88e476a5084142.css">
    <link integrity="" rel="stylesheet" href="/assets/demo-editor-38939799c6e6207d78b07192e9898ea0.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css">

    
  </head>
  <body class="ember-application" _vimium-has-onclick-listener="">
    <script src="//dij151upo6vad.cloudfront.net/2.6.0/js/vlaanderen-ui.js" type="text/javascript"></script>

    <script src="/assets/vendor-0e93c082b6dd34d4e38dd86bbf1c3164.js" integrity="sha256-MZtV36wbiJV5/P6JPhiLT2dy+U6WBTu1pMEAMqfoStE= sha512-f0jKmQt3MfTSVjFkyRKIvxG7oNgKok6V2Lg11JLIeZwSFrh8Y0woojznd4Im+nUcMaIPVAUXfMgIXvTBsho04A=="></script>
    <script src="/assets/demo-editor-c70aeffc293b284d8ec6581c29cb2ed4.js" integrity="sha256-VivTRBEiChdsEGTjUFtUw4ypuob607rfR1oNzaQ6EEg= sha512-hCJl8JJlczHwc5SBhl1ol/AbtSQ0ucHE4iMJ658gjgsFfiQ4QaON7kAdhuwObS99QuPOUHB1SYo7sstKdZwahQ=="></script>

    
  

<div id="ember232" class="ember-view"><div class="layout-container"> <!-- Add the class "design-demo" to the body in app/index.html to hide non-functional parts-->
  <div class="testing-hide"> <!-- Dev only -->
    <div class="u-display-inline-block">
      <!-- {{#link-to "front-page"}}Frontpage {{/link-to}} -->
    </div>

    <div class="u-display-inline-block">
      <label>Editor profile: </label>
      <select>
          <option value="default">default</option>
          <option value="all">all</option>
          <option value="none">none</option>
      </select>
    </div>
  </div>

  <nav id="ember271" class="chrome ember-view"><div class="grid">
	<div class="col--6-12">
	  <p class="smaller uppercase text-fade">Notulen: standaard template<i class="fa fa-angle-down"></i></p>
	</div>
	<div class="col--6-12 u-align-right">
<!---->	</div>
</div>
<div class="grid">
	<div class="col--5-12">
    <div id="ember276" class="ember-view">  <h1 class="h3 sans-serif">
    <a class="link-dark">
      <span class="small">←</span> Klik hier om titel toe te voegen
    </a>
  </h1>

</div>
	</div>
	<div class="col--7-12 u-align-bottom">
	  <div class="button-group u-align-right">
      
	  </div>
	</div>
</div>
</nav> <!-- Titel, save, ... -->

  <div vocab="http://data.vlaanderen.be/ns/besluit#" prefix="eli: http://data.europa.eu/eli/ontology# prov: http://www.w3.org/ns/prov# mandaat: http://data.vlaanderen.be/ns/mandaat# besluit: http://data.vlaanderen.be/ns/besluit#" resource="#" typeof="foaf:Document" class="app-view">
    <div id="ember279" class="editor-grid ember-view"><div class="editor-container">
	<div class="grid grid--collapse">
		<div class="col--12-12 flex">
			<div class="editor">
				<div class="grid">
					<div class="col--7-12">
<div id="ember294" class="editor__paper ember-view" contenteditable="true"><mark data-editor-highlight="true"><div typeof="besluit:Zitting" resource="http://data.lblod.info/zittingen/ae9c272b-9f86-4c4e-9949-c171006d5bc9">
  <div class="annotation-structure" id="documentinformatie">
    <!-- meta zitting -->
    <h2 class="h1">Notulen van de
      <span class="annotation annotation--organ" property="besluit:isGehoudenDoor" resource="https://data.lblod.info/id/bestuursorganen-classificaties/GE">Gemeenteraad Niel</span>, zitting van 21 februari 2018</h2>
    <p>
      <span class="annotation annotation--location" property="prov:atLocation" resource="http://data.vlaanderen.be/id/gemeentenaam/11030">Locatie Gemeente Niel</span>
    </p>
    <p>
      Woensdag 21 februari 2018,
      <span property="prov:startedAtTime" value="2018-02-21T19:00:00+01:00" class="annotation annotation--time">&gt;19:00</span> tot <span property="prov:endedAtTime" value="2018-02-21T23:12:00+01:00" class="annotation annotation--time">&gt;23:12</span>
    </p>
  </div>
  <!-- opening -->
  <div class="annotation-structure" id="opening">
    <h3 class="h2">Opening</h3>
    <p>De gemeenteraad-voorzitter verklaart de zitting open om 19:00 uur en deelt mee dat
  </p></div>
  <!-- aanwezigen-->
  <div class="annotation-structure" id="aanwezigen">
    <h3 class="h2">Aanwezigen</h3>
    <ul class="bullet-list">
      <li class="u-spacer--small">
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000019" typeof="mandaat:Mandataris">
          Tom De Vries (Burgemeester)
        </span>
      </li>
      <li class="u-spacer--small">
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000033" typeof="mandaat:Mandataris">
          Eddy Josée Soetewey (Voorzitter gemeenteraad)
        </span>
      </li>
      <li class="u-spacer--small">
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00002f" typeof="mandaat:Mandataris">
          Maritsa Elisa Moons (Schepen)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000031" typeof="mandaat:Mandataris">
          Tom Caluwaerts (Schepen)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000032" typeof="mandaat:Mandataris">
          Bart Alice Van der Velde (Schepen)
        </span>
      </li>
      <li class="u-spacer--small">
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000024" typeof="mandaat:Mandataris">
          Peter Arthur Laureys (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00001a" typeof="mandaat:Mandataris">
          Cindy Verschueren (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00002c" typeof="mandaat:Mandataris">
          Sabine Herremans (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00002d" typeof="mandaat:Mandataris">
          Bart Marcel Van Hove (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00001f" typeof="mandaat:Mandataris">
          Tim Sleeubus (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00002e" typeof="mandaat:Mandataris">
          Eddy Eduard Landuydt (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000027" typeof="mandaat:Mandataris">
          Vanessa Albert Van Linden (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000021" typeof="mandaat:Mandataris">
          Jan Alfons Van de Velde (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000020" typeof="mandaat:Mandataris">
          Anne Hilde Troch (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00002a" typeof="mandaat:Mandataris">
          Etienne Emile Franssen (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00001d" typeof="mandaat:Mandataris">
          Filip Gustaaf Van Eeckhout (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000029" typeof="mandaat:Mandataris">
          Julien Christiaan Deporte (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb00002b" typeof="mandaat:Mandataris">
          Freddy Lea Vermeiren (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000022" typeof="mandaat:Mandataris">
          Dirk Maria Vermant (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000028" typeof="mandaat:Mandataris">
          Anja Maria Roofthooft (Gemeenteraadslid)
        </span>,
        <span class="annotation" property="besluit:heeftAanwezigeBijStart" resource="https://data.lblod.info/id/mandatarissen/5a81ab404cac4f1ccb000026" typeof="mandaat:Mandataris">
          Tiffany Van den Berge (Gemeenteraadslid)
        </span>
      </li>

    </ul>
  </div>
  <!-- Agenda overzicht-->
  <div class="annotation-structure" id="agendaoverzicht">
    <h3 class="h2">Agenda overzicht</h3>
    <ul class="clickable-list">
      <li>
        <h4 class="h3">Open <mark data-editor-highlight="true">agendapunt</mark>en</h4>
      </li>
      <li><span property="besluit:behandelt" resource="http://data.lblod.info/agendapunten/4dac4404-3bba-4d17-a3e5-4fd5ab2f7f4a" typeof="besluit:Agendapunt" class="annotation annotation--agendapunt annotation--agendapunt--open">
  <meta property="besluit:geplandOpenbaar" datatype="xsd:boolean" content="true"> <span property="dc:title">Volgende&nbsp;week&nbsp;rustiger&nbsp;aan&nbsp;doen</span></span></li><span property="besluit:behandelt" resource="http://data.lblod.info/agendapunten/5a708ac1-39e2-4114-a83b-de7a0deb8887" typeof="besluit:Agendapunt" class="annotation annotation--agendapunt annotation--agendapunt--open">
  <meta property="besluit:geplandOpenbaar" datatype="xsd:boolean" content="true"> <span property="dc:title">Boom!&nbsp;tweede&nbsp;agendapunt</span></span>
      <li>
        <h4 class="h3">Besloten <mark data-editor-highlight="true">agendapunt</mark>en</h4>
      </li>
      <li><span property="besluit:behandelt" resource="http://data.lblod.info/agendapunten/f190439b-1a05-4e8c-b6a2-7a46206befcd" typeof="besluit:Agendapunt" class="annotation annotation--agendapunt annotation--agendapunt--besloten">
  <meta property="besluit:geplandOpenbaar" datatype="xsd:boolean" content="false"> <span property="dc:title">Ik&nbsp;zeg&nbsp;hier&nbsp;just&nbsp;niks&nbsp;over!&nbsp;</span>
</span></li>
      
    ​</ul>
  </div>

  <!-- Agenda overzicht -->
  <div class="annotation-structure" id="agendapunten">
    <h3 class="h2"><mark data-editor-highlight="true">Agendapunt</mark>en</h3>
    <h4 class="h3" id="agendaopen">Open <mark data-editor-highlight="true">agendapunt</mark>en</h4>
    <ul>
      <li class="annotation-structure annotation-structure--behandeling annotation-structure--behandeling--open">
        <mark data-editor-highlight="true">besluit</mark>
      </li>
    <li>
      <h4 class="h3">Besloten <mark data-editor-highlight="true">agendapunt</mark>en</h4>
    </li>
    <li>
      <span class="annotation annotation--agendapunt annotation--agendapunt--besloten">
        <mark data-editor-highlight="true">besluit</mark>
    </span></li>
    </ul>
  </div>

  <!-- Sluiting zitting-->
  <div class="annotation-structure" id="sluiting">
    <h3 class="h2">Sluiting van de zitting</h3>
    <p>De voorzitter sluit de zitting.</p>
  </div>
</div>e</mark>  		        

&nbsp;
</div>		      		</div>
					<div class="col--5-12">
						<div class="editor-hints">
<!---->							
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
</div>
  </div>

  <div class="testing-hide"> <!-- Dev only -->
    <div id="ember311" class="ember-view"><label id="ember316" class="checkbox ember-view"><input name="checkbox" id="ember319" class="checkbox__toggle ember-checkbox ember-view" type="checkbox">
<span></span>
  Enable debug

<!----></label>

<!---->
</div>
  </div>

  <!---->
</div>

</div></body><div><style type="text/css">/*
 * Many CSS class names in this file use the verbose "vimiumXYZ" as the class name. This is so we don't
 * use the same CSS class names that the page is using, so the page's CSS doesn't mess with the style of our
 * Vimium dialogs.
 *
 * The z-indexes of Vimium elements are very large, because we always want them to show on top.  We know
 * that Chrome supports z-index values up to about 2^31.  The values we use are large numbers approaching
 * that bound.  However, we must leave headroom for link hints.  Hint marker z-indexes start at 2140000001.
 */

/*
 * This vimiumReset class can be added to any of our UI elements to give it a clean slate. This is useful in
 * case the page has declared a broad rule like "a { padding: 50px; }" which will mess up our UI. These
 * declarations contain more specifiers than necessary to increase their specificity (precedence).
 */
.vimiumReset,
div.vimiumReset,
span.vimiumReset,
table.vimiumReset,
a.vimiumReset,
a:visited.vimiumReset,
a:link.vimiumReset,
a:hover.vimiumReset,
td.vimiumReset,
tr.vimiumReset {
  background: none;
  border: none;
  bottom: auto;
  box-shadow: none;
  color: black;
  cursor: auto;
  display: inline;
  float: none;
  font-family : "Helvetica Neue", "Helvetica", "Arial", sans-serif;
  font-size: inherit;
  font-style: normal;
  font-variant: normal;
  font-weight: normal;
  height: auto;
  left: auto;
  letter-spacing: 0;
  line-height: 100%;
  margin: 0;
  max-height: none;
  max-width: none;
  min-height: 0;
  min-width: 0;
  opacity: 1;
  padding: 0;
  position: static;
  right: auto;
  text-align: left;
  text-decoration: none;
  text-indent: 0;
  text-shadow: none;
  text-transform: none;
  top: auto;
  vertical-align: baseline;
  white-space: normal;
  width: auto;
  z-index: 2140000000; /* Vimium's reference z-index value. */
}

thead.vimiumReset, tbody.vimiumReset {
  display: table-header-group;
}

tbody.vimiumReset {
  display: table-row-group;
}

/* Linkhints CSS */

div.internalVimiumHintMarker {
  position: absolute;
  display: block;
  top: -1px;
  left: -1px;
  white-space: nowrap;
  overflow: hidden;
  font-size: 11px;
  padding: 1px 3px 0px 3px;
  background: linear-gradient(to bottom, #FFF785 0%,#FFC542 100%);
  border: solid 1px #C38A22;
  border-radius: 3px;
  box-shadow: 0px 3px 7px 0px rgba(0, 0, 0, 0.3);
}

div.internalVimiumHintMarker span {
  color: #302505;
  font-family: Helvetica, Arial, sans-serif;
  font-weight: bold;
  font-size: 11px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

div.internalVimiumHintMarker > .matchingCharacter {
  color: #D4AC3A;
}

div > .vimiumActiveHintMarker span {
  color: #A07555 !important;
}

/* Input hints CSS */

div.internalVimiumInputHint {
  position: absolute;
  display: block;
  background-color: rgba(255, 247, 133, 0.3);
  border: solid 1px #C38A22;
  pointer-events: none;
}

div.internalVimiumSelectedInputHint {
  background-color: rgba(255, 102, 102, 0.3);
  border: solid 1px #993333 !important;
}

div.internalVimiumSelectedInputHint span {
  color: white !important;
}

/* Frame Highlight Marker CSS*/
div.vimiumHighlightedFrame {
  position: fixed;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  padding: 0px;
  margin: 0px;
  border: 5px solid yellow;
  box-sizing: border-box;
  pointer-events: none;
}

/* Help Dialog CSS */

iframe.vimiumHelpDialogFrame {
  background-color: rgba(10,10,10,0.6);
  padding: 0px;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  display: block;
  position: fixed;
  border: none;
  z-index: 2139999997; /* Three less than the reference value. */
}

div#vimiumHelpDialogContainer {
  opacity:1.0;
  background-color:white;
  border:2px solid #b3b3b3;
  border-radius:6px;
  width: 840px;
  max-width: calc(100% - 100px);
  max-height: calc(100% - 100px);
  margin: 50px auto;
  overflow-y: auto;
  overflow-x: auto;
}

div#vimiumHelpDialog {
  min-width: 600px;
  padding:8px 12px;
}

span#vimiumTitle, span#vimiumTitle span,  span#vimiumTitle * { font-size:20px; }
#vimiumTitle {
  display: block;
  line-height: 130%;
  white-space: nowrap;
}
td.vimiumHelpDialogTopButtons {
  width: 100%;
  text-align: right;
}
#helpDialogOptionsPage, #helpDialogWikiPage {
  font-size: 14px;
  padding-left: 5px;
  padding-right: 5px;
}
div.vimiumColumn {
  width:50%;
  float:left;
  font-size: 11px;
  line-height: 130%;
}

div.vimiumColumn tr {
    display: table-row;
}

div.vimiumColumn td {
    display: table-cell;
    font-size: 11px;
    line-height: 130%;
}
div.vimiumColumn table, div.vimiumColumn td, div.vimiumColumn tr { padding:0; margin:0; }
div.vimiumColumn table { width:100%; table-layout:auto; }
div.vimiumColumn td { vertical-align:top; padding:1px; }
div#vimiumHelpDialog div.vimiumColumn tr > td:first-of-type {
  /* This is the "key" column, e.g. "j", "gg". */
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
  font-size:14px;
  text-align:right;
  white-space:nowrap;
}
span.vimiumHelpDialogKey {
  background-color: rgb(243,243,243);
  color: rgb(33,33,33);
  margin-left: 2px;
  padding-top: 1px;
  padding-bottom: 1px;
  padding-left: 4px;
  padding-right: 4px;
  border-radius: 3px;
  border: solid 1px #ccc;
  border-bottom-color: #bbb;
  box-shadow: inset 0 -1px 0 #bbb;
  font-family: monospace;
  font-size: 11px;
}
/* Make the description column as wide as it can be. */
div#vimiumHelpDialog div.vimiumColumn tr > td:nth-of-type(3) { width:100%; }
div#vimiumHelpDialog div.vimiumDivider {
  display: block;
  height:1px;
  width:100%;
  margin:10px auto;
  background-color:#9a9a9a;
}
div#vimiumHelpDialog td.vimiumHelpSectionTitle {
  padding-top:3px;
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
  font-size:16px;
  font-weight:bold;
}
div#vimiumHelpDialog td.vimiumHelpDescription {
  font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
  font-size:14px;
}
div#vimiumHelpDialog span.vimiumCopyCommandNameName {
  font-style: italic;
  cursor: pointer;
  font-size: 12px;
}
/* Advanced commands are hidden by default until you show them. */
div#vimiumHelpDialog tr.advanced { display: none; }
div#vimiumHelpDialog.showAdvanced tr.advanced { display: table-row; }
div#vimiumHelpDialog div.advanced td:nth-of-type(3) { color: #555; }
div#vimiumHelpDialog a.closeButton {
  font-family:"courier new";
  font-weight:bold;
  color:#555;
  text-decoration:none;
  font-size:24px;
  position: relative;
  top: 3px;
  padding-left: 5px;
}
div#vimiumHelpDialog a {
  text-decoration: underline;
}

div#vimiumHelpDialog a.closeButton:hover {
  color:black;
  -webkit-user-select:none;
}
div#vimiumHelpDialogFooter {
  display: block;
  position: relative;
  margin-bottom: 37px;
}
table.helpDialogBottom {
  width:100%;
}
td.helpDialogBottomRight {
  width:100%;
  float:right;
  text-align: right;
}
td.helpDialogBottomRight, td.helpDialogBottomLeft {
  padding: 0px;
}
div#vimiumHelpDialogFooter * { font-size:10px; }
a#toggleAdvancedCommands, span#help-dialog-tip {
  position: relative;
  top: 19px;
  white-space: nowrap;
  font-size: 10px;
}
a:link.vimiumHelDialogLink, a:visited.vimiumHelDialogLink,
  a:hover.vimiumHelDialogLink, a:active.vimiumHelDialogLink, a#toggleAdvancedCommands {
    color:#2f508e;
    text-decoration: underline;
}

/* Vimium HUD CSS */

div.vimiumHUD {
  display: block;
  position: fixed;
  bottom: 0px;
  /* Keep this far enough to the right so that it doesn't collide with the "popups blocked" chrome HUD. */
  right: 0px;
  color: black;
  height: auto;
  min-height: 13px;
  width: auto;
  max-width: 400px;
  min-width: 150px;
  text-align: left;
  background-color: #ebebeb;
  padding: 3px 3px 2px 3px;
  margin: 0;
  border: 1px solid #b3b3b3;
  border-radius: 4px 4px 0 0;
  font-family: "Lucida Grande", "Arial", "Sans";
  font-size: 12px;
  text-shadow: 0px 1px 2px #FFF;
  line-height: 1.0;
}

iframe.vimiumHUDFrame {
  display: block;
  background: none;
  position: fixed;
  bottom: 0px;
  right: 150px;
  height: 20px;
  min-height: 20px;
  width: 450px;
  min-width: 150px;
  padding: 0px;
  margin: 0;
  border: none;
  z-index: 2149999998; /* Two less than the reference value. */
  opacity: 0;
}

div.vimiumHUD span#hud-find-input, div.vimiumHUD span#hud-match-count {
  display: inline;
  outline: none;
  white-space: nowrap;
  overflow-y: hidden;
}

div.vimiumHUD span#hud-find-input br {
  display: none;
}

div.vimiumHUD span#hud-find-input * {
  display: inline;
  white-space: nowrap;
}

body.vimiumFindMode ::selection {
  background: #ff9632;
}

/* Vomnibar Frame CSS */

iframe.vomnibarFrame {
  background-color: transparent;
  padding: 0px;
  overflow: hidden;

  display: block;
  position: fixed;
  width: calc(80% + 20px); /* same adjustment as in pages/vomnibar.coffee */
  min-width: 400px;
  height: calc(100% - 70px);
  top: 70px;
  left: 50%;
  margin: 0 0 0 -40%;
  border: none;
  font-family: sans-serif;
  z-index: 2149999998; /* Two less than the reference value. */
}

div.vimiumFlash {
  box-shadow: 0px 0px 4px 2px #4183C4;
  padding: 1px;
  background-color: transparent;
  position: absolute;
  z-index: 2140000000;
}

/* UIComponent CSS */
iframe.vimiumUIComponentHidden {
  display: none;
}

iframe.vimiumUIComponentVisible {
  display: block;
}

iframe.vimiumUIComponentReactivated {
  border: 5px solid yellow;
}
</style><iframe class="vomnibarFrame vimiumUIComponentHidden" src="moz-extension://ee41a965-9d7f-924a-a9ec-665c22a7ac86/pages/vomnibar.html"></iframe></div></html>`
};
