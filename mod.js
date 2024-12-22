(function () {
    on('ready', () => {
        log('Tabletop Adventure Creator Import Script loaded!');
    });

    // Logs and handles failures
    const handleFailure = (type, name, error) => {
        log(`ROLL20 ERROR: Failed to create ${type}: ${name}. Error: ${error.message || error}`);
    };

    // Deletes existing Roll20 objects by name
    const deleteExistingObjects = (type, name) => {
        const existing = findObjs({ _type: type, name: name });
        if (existing.length) {
            existing.forEach(obj => obj.remove());
            log(`Deleted ${existing.length} existing ${type}(s) with name: ${name}`);
        }
    };

    // Adds an image to the map layer of a page
    const addImageToMapLayer = (imageUrl, pageId) => {
        // Create the graphic on the map layer
        const graphic = createObj("graphic", {
            _pageid: pageId,
            imgsrc: imageUrl,
            layer: "map",
            left: 768,
            top: 768,
            width: 1536,
            height: 1536,
            rotation: 0
        });

        if (!graphic) {
            log("ERROR: Failed to create the graphic on the map layer.");
            return false;
        }

        log(`Image added to map layer successfully`);
        return true;
    };

    // Adds a wall to the walls layer of a page
    const addWall = (pageId, startX, startY, endX, endY) => {
        try {
            // Create the wall using PathV2
            const wall = createObj("pathv2", {
                _pageid: pageId,
                shape: "pol", // polyline shape for walls
                points: JSON.stringify([[startX, startY], [endX, endY]]), // array of points
                stroke: "#0000ff",
                stroke_width: 5,
                layer: "walls",
                fill: "transparent",
                x: (startX + endX) / 2, // center x coordinate
                y: (startY + endY) / 2, // center y coordinate
                rotation: 0,
                barrierType: "wall", // dynamic lighting wall type
                controlledby: "" // GM control only
            });

            if (!wall) {
                log(`ERROR: Failed to create wall from (${startX},${startY}) to (${endX},${endY})`);
                return false;
            }

            return true;
        } catch (error) {
            log(`ERROR: Wall creation failed: ${error.message}`);
            return false;
        }
    };

    // Configures an existing Roll20 Page
    const configureScene = (scene) => {
        let success = 0, failure = 0;
        let errors = [];

        try {
            log(`Looking for scene to configure: ${scene.name}`);
            const existingPages = findObjs({ _type: 'page', name: scene.name });
            
            if (!existingPages.length) {
                throw new Error(`No page found with name: ${scene.name}`);
            }

            const page = existingPages[0];
            
            // Clean up existing objects on the page
            log(`Cleaning up existing objects on page: ${scene.name}`);
            const existingGraphics = findObjs({ _type: 'graphic', _pageid: page.id });
            const existingPaths = findObjs({ _type: 'pathv2', _pageid: page.id });
            
            existingGraphics.forEach(obj => {
                obj.remove();
            });
            existingPaths.forEach(obj => {
                obj.remove();
            });
            
            log(`Removed ${existingGraphics.length} graphics and ${existingPaths.length} walls`);

            // Update page settings for 1536x1536 with 50px grid
            const pageSettings = {
                showgrid: true,
                snapping_increment: 0.7142857142857143, //configure to ~50px cell width
                width: 21.94, // 1536/70 = 21.94 roughly, when we set snapping_increment to make 50px cells this will scale
                height: 21.94,
                grid_opacity: 0.5,
                scale_number: 5,
                scale_units: "ft",
                background_color: "#ffffff",
                grid_type: "square",
                dynamic_lighting_enabled: true,
                explorer_mode: 'basic'
            };

            page.set(pageSettings);

            // Add the background image first
            if (scene.imageUrl) {
                log(`Adding background image to scene: ${scene.name}`);
                // TODO: Remove this once we have a real image
                const imageUrl = 'https://files.d20.io/images/422031521/vCp6ixb_gawlk04DMeGkhQ/max.webp?1734898548';
                if (!addImageToMapLayer(imageUrl, page.id)) {
                    errors.push('Failed to add background image to map layer');
                }
            }

            // Then add walls if they exist
            if (scene.walls && scene.walls.length > 0) {
                log(`Adding ${scene.walls.length} walls to scene: ${scene.name}`);
                let wallsAdded = 0;
                
                scene.walls.forEach(wall => {
                    // Scale wall coordinates to match page size (using 70px as our base unit)
                    const scaleFactor = 70;
                    const scaledStartX = Math.round((wall.startX / 1536) * scaleFactor * page.get('width'));
                    const scaledStartY = Math.round((wall.startY / 1536) * scaleFactor * page.get('height'));
                    const scaledEndX = Math.round((wall.endX / 1536) * scaleFactor * page.get('width'));
                    const scaledEndY = Math.round((wall.endY / 1536) * scaleFactor * page.get('height'));

                    log(`Adding wall from (${scaledStartX},${scaledStartY}) to (${scaledEndX},${scaledEndY})`);
                    
                    if (addWall(page.id, scaledStartX, scaledStartY, scaledEndX, scaledEndY)) {
                        wallsAdded++;
                    }
                });

                log(`Successfully added ${wallsAdded} of ${scene.walls.length} walls`);
                
                if (wallsAdded < scene.walls.length) {
                    errors.push(`Failed to add ${scene.walls.length - wallsAdded} walls`);
                }
            }

            // If we have any errors, throw them all together
            if (errors.length > 0) {
                throw new Error(errors.join('; '));
            }

            log(`Scene configured: ${scene.name}`);
            success++;
        } catch (error) {
            failure++;
            handleFailure('Scene Configuration', scene.name, error);
        }

        return { success, failure };
    };

    // Imports an NPC
    const importNPC = (npc) => {
        let success = 0, failure = 0;

        try {
            deleteExistingObjects('character', npc.name); // Delete existing characters if they exist
            log(`Importing NPC: ${npc.name}`);

            const character = createObj('character', {
                name: npc.name,
                archived: false,
                avatar: 'https://files.d20.io/images/371064590/xocfkaWzISMpNlQWyDGxWg/max.png?1702226705'
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
            deleteExistingObjects('handout', note.name); // Delete existing handouts if they exist
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

        // Configure scenes first
        if (scenes.length) {
            log('Configuring scenes...');
            scenes.forEach((scene) => {
                const { success, failure } = configureScene(scene);
                sceneSuccess += success;
                sceneFailure += failure;
            });
        }

        // Then process monsters and notes
        if (monsters.length) {
            log('Processing monsters...');
            monsters.forEach((npc) => {
                const { success, failure } = importNPC(npc);
                monsterSuccess += success;
                monsterFailure += failure;
            });
        }

        if (notes.length) {
            log('Processing notes...');
            notes.forEach((note) => {
                const { success, failure } = importNote(note);
                noteSuccess += success;
                noteFailure += failure;
            });
        }

        // Prepare final summary
        const report = `TAC Import Complete.\n` +
            `Scenes: ${sceneSuccess} configured, ${sceneFailure} failed.\n` +
            `Monsters: ${monsterSuccess} imported, ${monsterFailure} failed.\n` +
            `Notes: ${noteSuccess} imported, ${noteFailure} failed.`;
        log(report);
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