# Slarmoo's Box Testing

Slarmoo's Box is an online tool for sketching and sharing instrumental music.
You can find it [here](https://github.com/slarmoo/slarmoosbox/).
It is a modification of [Ultrabox](https://ultraabox.github.io), which is a modification of [JummBox](https://github.com/jummbus/jummbox), which in turn is a modification of the [original BeepBox](https://beepbox.co).

Slarmoo's Box is a mod of Ultrabox that aims to advance Beepbox's capabilities. Feel free to contribute!


All song data is packaged into the URL at the top of your browser. When you make
changes to the song, the URL is updated to reflect your changes. When you are
satisfied with your song, just copy and paste the URL to save and share your
song!

Slarmoo's Box, as well as the beepmods which it's based on, are free projects. If you ever feel so inclined, please support the original creator, [John Nesky](http://www.johnnesky.com/), via
[PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=QZJTX9GRYEV9N&currency_code=USD)!

## Compiling

The source code is available under the MIT license. The code is written in
[TypeScript](https://www.typescriptlang.org/) and requires
[Bun](https://bun.sh), so install that first. Then to
build this project, open a command line and run:

```
git clone https://github.com/PopCat19/JukeBox-Exp.git
cd JukeBox-Exp
bun install
bun run build
```

The build uses [esbuild](https://esbuild.github.io/) to bundle all four targets:
synth, player, editor, and EditorConfig.

## Development

Start the live dev server with:

```
bun run dev
```

This watches source files with esbuild and serves the site locally with
auto-reload. Open the URL printed in the terminal.

Type-check and lint with:

```
bun run lint
```

## Code

The code is divided into several folders. This architecture is identical to BeepBox's.

The [synth/](synth) folder has just the code you need to be able to play Slarmoo's Box
songs out loud, and you could use this code in your own projects, like a web
game. After compiling the synth code, open website/synth_example.html to see a
demo using it.

The [editor/](editor) folder has additional code to display the online song
editor interface. After compiling the editor code, open website/index.html to
see the editor interface.

The [player/](player) folder has a miniature song player interface for embedding
on other sites.

The [website/](website) folder contains index.html files to view the interfaces.
The build process outputs JavaScript files into this folder.

## Dependencies

Most of the dependencies are listed in [package.json](package.json), although
 Slarmoo's Box also has an indirect, optional dependency on
[lamejs](https://www.npmjs.com/package/lamejs) via
[jsdelivr](https://www.jsdelivr.com/) for exporting .mp3 files. If the user
attempts to export an .mp3 file, Slarmoo's Box will direct the browser to download
that dependency on demand. 
Additionally, random envelopes rely on [js-xxhash](https://npmjs.com/package/js-xxhash) for fast hashing.
