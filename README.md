# roll20-tac-importer
The official module for importing Tabletop Adventure Creator adventures into Roll20

## Testing

To test the module you can copy the contents of mod.js into the Roll20 module editor. As a note it must be set to "Experimental API" to be compatible with the new D&D 2024 sheets.


## Release

To release a new version of the module we will tag the repository with the version number then copy the script to the Roll20 script github repo as a new PR for review and approval.



# Limitations:

- Roll20 scripts/mods don't support creating pages (https://app.roll20.net/forum/post/4538850/slug%7D)
- Roll20 scripts/mods don't support image uploads (https://app.roll20.net/forum/post/11347088/slug%7D)
- Roll20 scripts/mods don't support creating folders (https://app.roll20.net/forum/post/6765123/slug%7D)
- Roll20 scripts/mods don't let handouts be created in folders (https://app.roll20.net/forum/post/11051110/slug%7D)
- Roll20 scripts/mods don't have a satisfactory way to implement an importer for Beacon sheets (https://app.roll20.net/forum/post/12178623/character-json-dump-for-d-and-d-2024-sheets/?pageforid=12179003)