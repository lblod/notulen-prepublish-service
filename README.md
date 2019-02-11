# Notulen prepublish service
This service acts on document containers. Provides the following calls:

- `/prepublish/notulen/:documentIdentifier`: returns a publication of a notulen without persisting it. 
- `/prepublish/agenda/:documentIdentifier`: returns a publication of an agenda without persisting it.
- `/prepublish/besluitenlijst/:documentIdentifier`: returns a publication of an agenda without persisting it.
- `/signing/agenda/sign/:kind/:documentIdentifier`:  persists (if it doesn't exist yet) an agenda publication for :kind and creates a signedResource linked to the agenda.
- `/signing/agenda/publish/:kind/:documentIdentifier`:  persists  (if it doesn't exist yet) an agenda publication for :kind and creates a publishedResource linked to the agenda.
- `/signing/notulen/sig/:documentIdentifier`:  persists (if it doesn't exist yet) a besluitenlijst publication and creates a signedResource linked to the besluitenlijst.
- `/signing/besluitenlijst/publish/:documentIdentifier`:  persists  (if it doesn't exist yet) an besluitenlijst publication and creates a publishedResource linked to the besluitenlijst.
- `/signing/notulen/sign/:kind/:documentIdentifier`:  persists (if it doesn't exist yet) a notulen publication for :kind and creates a signedResource linked to the notulen.
- `/signing/notulen/publish/:kind/:documentIdentifier`:  persists  (if it doesn't exist yet) a notulen publication for :kind and creates a publishedResource linked to the notulen.
