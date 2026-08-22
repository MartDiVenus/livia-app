/**
 * LiViA Editor™ - Google Workspace Add-on Handler
 */

function onHomepage(e) {
  return createMainCard(e);
}

function onDriveHomepage(e) {
  return createMainCard(e);
}

function onDocsHomepage(e) {
  return createMainCard(e);
}

function onDriveItemsSelected(e) {
  return createMainCard(e);
}

function createMainCard(e) {
  var builder = CardService.newCardBuilder();
  builder.setHeader(CardService.newCardHeader().setTitle("LiViA Editor™"));

  var section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph().setText("Apri e modifica i tuoi documenti in stile Vim con LiViA Editor™.")
  );

  var webAppUrl = "https://ais-pre-cx2wjgtullqlljij7htqqx-90238823391.europe-west2.run.app/";

  var button = CardService.newTextButton()
    .setText("Lancia LiViA Editor™")
    .setOpenLink(CardService.newOpenLink().setUrl(webAppUrl));

  section.addWidget(button);
  builder.addSection(section);

  return builder.build();
}
