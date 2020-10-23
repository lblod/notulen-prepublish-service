# Notulen prepublish service
This service acts on document containers. Provides the following calls:
Note that the agenda routes operate on a differen api than the other resources, this
is a work in progress, and eventually all routes will be based on the zitting instead 
of the document

- `/prepublish/agenda/:zittingIdentifier`: builds a publication from the agenda of a zitting present in the database, and returns it without persisting it
- `/signing/agenda/sign/:kind/:zittingIdentifier`:  persists (if it doesn't exist yet) an agenda publication for :kind and creates a signedResource linked to the agenda.
- `/signing/agenda/publish/:kind/:zittingIdentifier`:  persists  (if it doesn't exist yet) an agenda publication for :kind and creates a publishedResource linked to the agenda.

- `/prepublish/notulen/:documentIdentifier`: returns a publication of a notulen without persisting it. 
- `/signing/notulen/sign/:kind/:documentIdentifier`:  persists (if it doesn't exist yet) a notulen publication for :kind and creates a signedResource linked to the notulen.
- `/signing/notulen/publish/:kind/:documentIdentifier`:  persists  (if it doesn't exist yet) a notulen publication for :kind and creates a publishedResource linked to the notulen.

- `/prepublish/besluitenlijst/:documentIdentifier`: returns a publication of an agenda without persisting it.
- `/signing/besluitenlijst/sign/:documentIdentifier`:  persists (if it doesn't exist yet) a besluitenlijst publication and creates a signedResource linked to the besluitenlijst.
- `/signing/besluitenlijst/publish/:documentIdentifier`:  persists  (if it doesn't exist yet) an besluitenlijst publication and creates a publishedResource linked to the besluitenlijst.
