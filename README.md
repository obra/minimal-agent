Some folks were talking about how minimal they could make a functional coding agent.

I decided to play the game.

`src/agent.ts` was, roughly, what Claude Code could do.

Then I set it upon itself.

Over the course of 20 minutes, it golfed itself down to something pretty darn minimal.

`jsrc/smallest-agent.js` is currently 803 bytes.

`smallest-agent.commented.js` is a commented version of the code with easier to read variable names.

`# terser -c -m  --module smallest-agent.commented.js  > src/smallest-agent.js is how we do the last bit of the transform`

IT HAS UNRESTRICTED BASH ACCESS. 
IT CAN DO ANYTHING. 
IT MIGHT DECIDE TO ERASE ALL YOUR FILES AND INSTALL LINUX
