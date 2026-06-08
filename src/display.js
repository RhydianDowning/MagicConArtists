import chalk from "chalk";
import boxen from "boxen";

function sorted(artistCards) {
  return Object.entries(artistCards)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([artist, cards]) => [artist, [...cards].sort((a, b) => a.card.localeCompare(b.card))]);
}

export function printResults(artistCards, basicLandCards = {}, artistBooths = {}) {
  console.log(boxen(chalk.bold("SignatureHunter Results"), { padding: 0, borderColor: "cyan" }));
  console.log();

  // Separate mainboard from sideboard/considering
  const mainArtistCards = {};
  const sideArtistCards = {};

  for (const [artist, cards] of Object.entries(artistCards)) {
    const main = cards.filter((c) => c.board === "mainboard");
    const side = cards.filter((c) => c.board !== "mainboard");
    if (main.length) mainArtistCards[artist] = main;
    if (side.length) sideArtistCards[artist] = side;
  }

  for (const [artist, cardList] of sorted(mainArtistCards)) {
    const booth = artistBooths[artist] ? chalk.dim(` [${artistBooths[artist]}]`) : "";
    console.log(chalk.bold.green(`▼ ${artist}`) + booth + chalk.bold.green(":"));
    cardList.forEach((e, i) =>
      console.log(chalk.white(`  ${i + 1}) ${e.card}`) + chalk.gray(` - ${e.set} #${e.num}`))
    );
    console.log();
  }

  if (Object.keys(sideArtistCards).length > 0) {
    console.log(chalk.dim("─".repeat(50)));
    console.log(chalk.dim.italic("  Sideboard / Considering\n"));
    for (const [artist, cardList] of sorted(sideArtistCards)) {
      console.log(chalk.dim.green(`▼ ${artist}:`));
      cardList.forEach((e, i) =>
        console.log(chalk.dim(`  ${i + 1}) ${e.card} - ${e.set} #${e.num}`) + chalk.dim.italic(` (${e.board})`))
      );
      console.log();
    }
  }

  if (Object.keys(basicLandCards).length > 0) {
    console.log(chalk.dim("─".repeat(50)));
    console.log(chalk.dim.italic("  Basic Lands\n"));
    for (const [artist, cardList] of sorted(basicLandCards)) {
      console.log(chalk.dim.green(`▼ ${artist}:`));
      cardList.forEach((e, i) =>
        console.log(chalk.dim(`  ${i + 1}) ${e.card} - ${e.set} #${e.num}`))
      );
      console.log();
    }
  }
}

export function printIgnored(ignoredLands) {
  if (Object.keys(ignoredLands).length === 0) return;
  const parts = Object.entries(ignoredLands).map(([name, count]) => `${count} [ ${name} ]`);
  console.log(chalk.yellow(`Basic lands are not searched, therefore: Ignored ${parts.join(" and ")}`));
}
