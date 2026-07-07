
# Terminology
It's getting confusing using the word "level" in this doc to refer to both individual garden's sub-levels as well as which garden file is being used, so I'm going to refer to each garden file as a separate garden "mode", where the bird garden is mode2 and the first garden is mode1. Please rename files accordingly.

# Birdspec Overview
I'm planning on making a new garden view which unlocks once all the stages in each level in levels.yaml are complete. I'd like that garden view to exist in a new file called "mode2.yaml" at the path src/garden/mode2/mode2.yaml. In this new garden view I want to animate some birds that can appear and move around. I have assets for the birds flapping their wings and also moving to peck seeds. After each animation, the bird goes back to its idle position. In it's idle position, I'd like you to make it hop around every so often, randomly doing a wing flap or peck animation interspersed between the hopping. It is VERY IMPORTANT that this new view does not mess with the functionality of the existing garden. This bird garden is only for the default app, not /dad

# Ensuring unchanged previous behavior
- Default mode1 load path unchanged until unlock flag is set
- Existing layout.yaml positions and animations unchanged
- /dad route unaffected
- Task completion before unlock behaves identically to today
- Dev save for mode1 will write to the correct mode 1 yaml files.

# Garden Objects
In the mode2.yaml file I will create objects for the garden as I did in the previous levels.yaml file. Some of these objects will be flowers like defined in the previous file, and some will be birds. 

## Bird Perches
Some birds I will add with perches, and will hatch from eggs. Stage 0 will create the bird's perch, stage 1 will create it's egg, and the following stages will have the egg hatch and become a bird. This will act pretty similarly to the planter scenario. These particular birds will not hop around or have the more complex bird animations I'm asking for later in this doc.


## Bird Animation
In the mode2.yaml file I will define bird objects for the garden, which can each have a wingflap, peck animation, and/or idle animation. I want to be able to specify which png files are each frame of these animations, and which frame is the bird's idle pose. 

### Hopping birds and Bird Surfaces
Some birds I would like you to add hopping animations for, which will basically make them hop around while in their idle pose. I'd like the editor to allow me to define what in the garden acts as a surface for the bird to hop on. I'm picturing being able to draw a rectangle of varying height and width, where any point on that rectangle is an acceptable place for the bottom of a bird's foot to land. I'd also like to be able to draw a rectangle for a food source, so when a bird's pecking animation occurs, it will potentially flip the art asset to face the correct direction when it pecks at the food. If a bird hops in a particular direction, I would like the bird's art asset to be facing the direction it hops towards. I will by default create the art assets facing right, so if it hops left, you will have to flip the asset, and if it hops right, you can leave the asset as-is. A hop should have an arc to its motion so there is some verticality to it. I'd like some variables I can use in the mode2.yaml file which determine how frequently hops, wingflaps, and pecks occur. Each of these states should be mutually exclusive to each other, not happening at the same time for the same bird.

#### New rectangles clarifications
- The new hop / food rectangles should live in a new yaml file called surfaces.yaml and be saved and created from the editor.

#### Bird Definition Clarifications
- Perch birds and animation birds should be separate yaml mode values
- Perch birds are a mode where an art asset should show at the moment its level starts, but each asset after that is multi-stage and replaces the previous asset with the exception of the level-start asset.
- A bird definition may have hatching as well as ambient hopping, but if-so, I would like to be able to define at each stage whether or not it should hop. An egg hopping around wouldn't make sense.

## Unlock screens
When a new level starts, I'd like a cheerful pop-up that says "You've unlocked..." and a build-up sort of sound with a growing box below that gives the feeling of a surprise gift box opening. It should say "Tap to open!" below it and look like of flashy (not in an epilepsy-inducing way). When you tap it, it should burst open with stars and say the name of the thing you've unlocked with an image of that thing. Have a "Tap to dismiss" text under it so it's clear how to make that unlock screen vanish. 

## Level2 beginning screen
When all the levels in levels.yaml are complete, you should show a pop-up that says, "Congratulations! You've completed your first garden!" And show a tap to continue button underneath, which progresses the text to the next bit, which should act like the unlock screen defined earlier with the exciting build up, saying "You've unlocked... The Bird Garden!". It should then update the screen, erasing the assets from levels.yaml, and maybe showing a bird bath in the middle of the screen just so there's a starting element in the new garden. The unlock text should move to the bottom of the screen for a moment so the user can see the new garden, then it should go back to its previous position.Then, when tapped, it should say "You can return to your previous garden any time if you get nostalgic, but it won't progress beyond this point. Click this button to do so!" It should then create a new button on the bottom right of the screen with a flower icon that illuminates to show where it is and has a temporary bold arrow pointing to it. The text when tapped  will update to say "Enjoy your new lovely garden!" and when dismissed, will show the new garden view with the todo list. Each of these text snippets should be put into one collective file for storing text strings for display purposes. The bird bath should be defined as a first mode2 level definition, which you should code into that yaml file for me. Here's the order of what occurs for clarity.
1. Text: "Congratulations! You've completed your first garden!" -> User taps and current text vanishes
2. Text: "You've unlocked..."
3. Growing gift-box pop-up -> User taps
4. Text: "The Bird Garden!" with image of a bird -> User taps and text vanishes
5. Mode 1 fades away, Mode 2 now displays
6. Text: "You can return to your previous garden any time if you get nostalgic, but it won't progress beyond this point. Click this button to do so!"
7. New button appears with arrow and glowing
8. User taps and text vanishes as well as arrow and glow effect
9. Text: "Enjoy your new lovely garden!" -> user taps
10. Text vanishes and Mode 2 is now the main view.
- the flower toggle button should be permanent after this flow and be hidden in mode 1. 

### When to trigger garden progress
- When the last level has completed all of it's stages, and a final task is then completed, the garden should then progress to its next mode
- The unlock can be reset if the user clicks to reset their garden progress.

### How progress per-mode is tracked
- When mode 2 begins, level and stage progress should be reset to 0. When the previous garden view screen is shown, it should still display as if the user was at the final level and final stage (but not triggering the "progress to mode 2" pop-ups of course since this is just a view screen). When returning to mode 2 from that mode-1-view screen, the level and stage progress in mode 2 should look the same as it did before the mode-1-view button was clicked.
- Mode2 should have it's own levels entries and level numbers starting at 1 again

## Previous garden view screen
This should be a simple button as explained above, which, when clicked, will allow the user to view their previous garden as defined from levels.yaml. If clicked again, it will return to their latest garden view, which at this point should be the bird garden. The mode 1 view should not show the task list, just the garden.

## Dev Mode and Editor Changes
I would like dev mode to allow me to select between the gardens of mode1.yaml and mode2.yaml, as well as keeping its existing functionality of setting what level I'm at within those gardens. When I click save in the editor mode, it should save to the correct corresponding layout yaml of the garden's level file I'm looking at.

# This would be helpful!
- Please include commented-out example bird definitions for each bird type in the new mode2 file.