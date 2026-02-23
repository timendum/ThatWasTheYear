ThatWasTheYear (hosted at https://ellorans.github.io/ThatWasTheYear/) is a browser-based multiplayer game where players take turns drawing mystery song cards and placing them into their personal timelines in chronological order.
Each round, a song is drawn from a deck (sourced from a local songLibrary).
The game attempts to fetch artwork and a 30s preview from the iTunes Search API; if a preview is available, the player hears a 10-second preview and must drop the mystery card into the correct chronological position on their timeline.
The first player to build a timeline of 10 songs wins.

<p align="center">
<img width="738" height="707" alt="image" src="https://github.com/user-attachments/assets/990c2242-7d18-4387-916a-17f43eaa5c6b" />
</p>

<b>How to play</b>

Start the game and enter at least two player names (additional players can be added).
Each player begins with one random song in their timeline.
On your turn, click "Draw" to draw a mystery song.
A 10-second preview will play and you may replay it by clicking the "Replay ♫" button.
Drag the mystery card and drop it into the timeline drop zone at the position you believe is correct chronologically.
If your guess is correct, the card is inserted at that position.
If incorrect, your guess fails and the turn passes to the next player.
The first player whose timeline reaches 10 songs wins and a confetti animation is shown.

<section id="requirements">
<h2>Requirements</h2>
<p>Modern browser with:</p>
<ul>
<li>Support for ES6+ JavaScript</li>
<li>Fetch API</li>
<li>Audio playback</li>
<li>Drag &amp; drop APIs</li>
</ul>
<p>The iTunes Search API is used to fetch album artwork and audio previews. (No API key required.)</p>
</section>
