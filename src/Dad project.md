# Spec

## Connecting to the new UI
When the user connects to the website with the url route /dad added to the normal url, they should see the following UI specification instead of the default. It is VERY IMPORTANT that the default behavior remain unchanged when visiting the normal website url without the /dad extension. All changes listed below should only apply when visiting the /dad url. 

## Visual Changes 
### Overall look
- This is meant to be a father's day gift for my dad, so I want it to be much less feminine overall
- I'm going to theme this to-do list around space, specifically the moon. I've created an art asset for the moon itself, which will replace the green grass of the garden. If it's easier for you to make it work with the scrolling and resizing, you can do your best to copy that art asset programmatically rather than using the actual png. I've placed the asset at public\garden\moontex.png
- This new route will require different colors for the UI elements, since we don't want them to be pink. I'd like them to either match or complement the colors of the moon asset, or look spacey in some way, whichever you can make look better.
- The background color should be a very dark blue reminiscent of space
- Some stars in the background would also look nice, maybe winking in and out?
### Task Completion Changes

Currently, when a task is completed, it shows a flower growing across the task, which no longer matches the theming of the new list. We should change this to a small rocketship blasting across the task, with it's trail of flames crossing it out rather than the stem of a flower. The rocketship will replace the flower bloom itself.

### Mascot Changes

We want the mascot to be replaced by the art asset at this path: public\garden\clipboardalien.png . The mascot's phrases should also be replaced with some less girly ones. Here are a few examples:
- "You're a star!"
- "I can astro-NOT believe you did that!"
- "Shoot for the moon!"
- "Simply LEM-sational!" <- this one is because I'm adding new art assets with a lunar lander (which is also called a LEM)
- "Wow, you're out of this world!"
- "You're a stellar dad!"
- "Emma says she loves you and is super impressed!"

## Level Changes

The logic for the parsing of level yaml files should remain the same, but the level + layout files themselves will change to use the new assets. Create a new folder called dadLevels with new files for the level and layout. When I use the editor mode and save while at the /dad route, I want my changes to save to this folder only. Similarly, when visiting the /dad route, it should create the level using those files as well.

You can create the level and layout files with the assets from this folder to start: public\garden\assets\Dad\fdaymessage . It should be the multiStage, non animated type.
