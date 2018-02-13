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
  </div>`
};
