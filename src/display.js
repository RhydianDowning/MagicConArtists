import chalk from "chalk";
import boxen from "boxen";

export function printResults(artistCards) {
  console.log(boxen(chalk.bold("SignatureHunter Results"), { padding: 0, borderColor: "cyan" }));
  console.log();

  for (const [artist, cardList] of Object.entries(artistCards)) {
    console.log(chalk.bold.green(artist + ":"));
    cardList.forEach((e, i) =>
      console.log(chalk.white(`  ${i + 1}) ${e.card}`) + chalk.gray(` - ${e.set} #${e.num}`))
    );
    console.log();
  }
}

export function printIgnored(ignoredLands) {
  if (Object.keys(ignoredLands).length === 0) return;
  const parts = Object.entries(ignoredLands).map(([name, count]) => `${count} [ ${name} ]`);
  console.log(chalk.yellow(`Basic lands are not searched, therefore: Ignored ${parts.join(" and ")}`));
}
