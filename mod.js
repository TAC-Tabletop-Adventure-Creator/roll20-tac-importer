(function () {
    on('ready', () => {
        log('Tabletop Adventure Creator Import Script loaded!');
    });

    // Deletes an existing Roll20 object by name
    const deleteExistingObject = (type, name) => {
        const existing = findObjs({ _type: type, name });
        if (existing.length) {
            existing.forEach(obj => obj.remove());
            log(`Deleted existing ${type} with name: ${name}`);
        }
    };

    // Logs and handles failures
    const handleFailure = (type, name, error) => {
        log(`ROLL20 ERROR: Failed to create ${type}: ${name}. Error: ${error.message || error}`);
    };

    // Imports a scene as a Roll20 Page
    const importScene = (scene) => {
        let success = 0, failure = 0;

        try {
            deleteExistingObject('page', scene.name); // Delete existing page if it exists
            log(`Importing scene: ${scene.name}`);

            // Create a new Page
            const page = createObj('page', {
                name: scene.name,
                showgrid: true, // Enable grid by default
                background_color: '#ffffff',
                scale_number: 5, // Default scale
                scale_units: 'ft',
                grid_type: 1, // Square grid
                grid_opacity: 0.5,
                gridcolor: '#000000',
                snapping_increment: 1,
            });

            if (!page) throw new Error('Failed to create page.');

            if (scene.imageUrl) {
                page.set('background_image', scene.imageUrl);
            }

            log(`Scene imported: ${scene.name}`);
            success++;
        } catch (error) {
            failure++;
            handleFailure('Scene', scene.name, error);
        }

        return { success, failure };
    };

    // Imports an NPC
    const importNPC = (npc) => {
        let success = 0, failure = 0;

        try {
            deleteExistingObject('character', npc.name); // Delete existing character if it exists
            log(`Importing NPC: ${npc.name}`);

            const character = createObj('character', {
                name: npc.name,
                archived: false,
            });

            if (!character) throw new Error('Failed to create character object.');

            createObj('attribute', {
                characterid: character.id,
                name: 'npc_description',
                current: npc.description,
            });

            if (npc.imageUrl) {
                character.set('avatar', npc.imageUrl);
            }

            log(`NPC imported: ${npc.name}`);
            success++;
        } catch (error) {
            failure++;
            handleFailure('NPC', npc.name, error);
        }

        return { success, failure };
    };

    // Imports a note
    const importNote = (note) => {
        let success = 0, failure = 0;

        try {
            deleteExistingObject('handout', note.name); // Delete existing handout if it exists
            log(`Importing note: ${note.name}`);

            const handout = createObj('handout', {
                name: note.name,
                archived: false,
            });

            if (!handout) throw new Error('Failed to create handout object.');

            handout.set('notes', note.description);

            log(`Note imported: ${note.name}`);
            success++;
        } catch (error) {
            failure++;
            handleFailure('Note', note.name, error);
        }

        return { success, failure };
    };

    // Processes a TAC JSON export
    const processTacExport = (jsonData) => {
        const { scenes = [], monsters = [], notes = [] } = jsonData;

        let sceneSuccess = 0, sceneFailure = 0;
        let monsterSuccess = 0, monsterFailure = 0;
        let noteSuccess = 0, noteFailure = 0;

        // Process scenes
        scenes.forEach((scene) => {
            const { success, failure } = importScene(scene);
            sceneSuccess += success;
            sceneFailure += failure;
        });

        // Process monsters
        monsters.forEach((npc) => {
            const { success, failure } = importNPC(npc);
            monsterSuccess += success;
            monsterFailure += failure;
        });

        // Process notes
        notes.forEach((note) => {
            const { success, failure } = importNote(note);
            noteSuccess += success;
            noteFailure += failure;
        });

        // Prepare final summary
        const report = `TAC Import Complete.\n` +
            `Scenes: ${sceneSuccess} imported, ${sceneFailure} failed.\n` +
            `Monsters: ${monsterSuccess} imported, ${monsterFailure} failed.\n` +
            `Notes: ${noteSuccess} imported, ${noteFailure} failed.`;

        sendChat('tac', `/w gm ${report}`);
    };

    // Chat message handler
    on('chat:message', (msg) => {
        if (msg.type !== 'api') return;

        const args = msg.content.split(/ --(help|import) ?/g);
        const command = args.shift().substring(1).trim();

        if (command !== 'tac') return;

        const subCommand = args[0]?.trim();
        const param = args[1]?.trim();

        switch (subCommand) {
            case 'help':
                log('Help command invoked.');
                sendChat('tac', '/w gm Use --import {json} to import TAC data.');
                break;

            case 'import':
                if (!param) {
                    log('Import command requires a JSON string parameter.');
                    sendChat('tac', '/w gm Provide a valid JSON string for import.');
                    return;
                }

                try {
                    const jsonData = JSON.parse(param);
                    processTacExport(jsonData);
                } catch (e) {
                    log('Error parsing JSON:', e.message || e);
                    sendChat('tac', '/w gm Error: Invalid JSON provided.');
                }
                break;

            default:
                log(`Unknown sub-command: ${subCommand}`);
                sendChat('tac', `/w gm Unknown sub-command: ${subCommand}`);
        }
    });
})();