import { getBuilding, tutorial } from '../data'
import { getLanguage, t } from '../i18n/language'
import { getTier } from '../sim/tiers'
import { formatCost } from './messages'

export interface HintText {
  title: string
  body: string
}

const name = (buildingId: string): string => getBuilding(buildingId).name

/** A name inside an English sentence: "Fishery" becomes "fishery". German nouns keep their capital. */
export function inText(text: string): string {
  return getLanguage() === 'en' ? text.charAt(0).toLowerCase() + text.slice(1) : text
}
const tierName = (tierId: string): string => getTier(tierId).name
const unlockResidents = (buildingId: string): number => getBuilding(buildingId).unlock?.residents ?? 0
const houseCount = (): number => tutorial.find((step) => step.id === 'houses')?.done[0]?.houses ?? 0

/** Building materials a house takes when it rises into the tier, e.g. "Werkzeug 1 · Holz 4". */
function riseCost(tierId: string): string {
  const cost = getTier(tierId).upgradeCost
  return cost ? formatCost(cost) : ''
}

/** Common end of the rise tips. */
function riseRule(): string {
  return t(
    'Tippe ein Haus an, um zu sehen, was ihm noch fehlt.',
    'Tap a house to see what it still lacks.',
  )
}

/** Title and text of a beginner tip, in the current language. */
export function hintText(stepId: string): HintText {
  switch (stepId) {
    case 'houses':
      return {
        title: t('Willkommen auf deiner Insel', 'Welcome to your island'),
        body: t(
          `Am Strand steht dein Kontor, das Lager für alle Waren. Baue in seiner Nähe ${houseCount()} Pionierhäuser. Bewohner ziehen ein und zahlen Steuern. Häuser brauchen keine Straße, müssen aber im Einzugsgebiet von Kontor oder Markthaus liegen.`,
          `Your trading post stands on the beach: it is the store for all goods. Build ${houseCount()} pioneer houses near it. Residents move in and pay taxes. Houses need no road, but they must lie within reach of the trading post or a market house.`,
        ),
      }
    case 'food':
      return {
        title: t('Nahrung für die Pioniere', 'Food for the pioneers'),
        body: t(
          `Pioniere brauchen Nahrung. Baue eine ${name('fishery')} an der Küste und verbinde sie mit einer Straße zum Kontor. Betriebe liefern nur über Straßen ins Lager.`,
          `Pioneers need food. Build a ${inText(name('fishery'))} on the coast and connect it to the trading post with a road. Producers only deliver to the store along roads.`,
        ),
      }
    case 'wood':
      return {
        title: t('Holz nachliefern', 'Keep the wood coming'),
        body: t(
          `Jedes Gebäude kostet Holz, und der Vorrat vom Start reicht nicht lange. Baue ein ${name('forester')} am Wald und schließe es per Straße an.`,
          `Every building costs wood, and the starting supply will not last. Build a ${inText(name('forester'))} by the forest and connect it with a road.`,
        ),
      }
    case 'cloth':
      return {
        title: t('Stoffe für die Pioniere', 'Cloth for the pioneers'),
        body: t(
          `Pioniere wollen auch Kleidung. Eine ${name('sheep_farm')} liefert Wolle, die ${name('weaver')} macht daraus Stoffe. Baue beides und verbinde es mit Straßen. Je mehr Bedürfnisse erfüllt sind, desto mehr Steuern zahlen die Bewohner.`,
          `Pioneers also want clothing. A ${inText(name('sheep_farm'))} provides wool and the ${inText(name('weaver'))} turns it into cloth. Build both and connect them with roads. The more needs are met, the more taxes the residents pay.`,
        ),
      }
    case 'grow':
      return {
        title: t('Die Siedlung wächst', 'The settlement grows'),
        body: t(
          `Baue weitere Pionierhäuser. Ab ${unlockResidents('chapel')} ${tierName('pioneers')}n kannst du eine ${name('chapel')} bauen. Brauchst du mehr Platz, erweitert ein ${name('market_house')} das Einzugsgebiet und das Lager.`,
          `Build more pioneer houses. At ${unlockResidents('chapel')} ${inText(tierName('pioneers'))} you can build a ${inText(name('chapel'))}. If you need more room, a ${inText(name('market_house'))} extends the reach and the store.`,
        ),
      }
    case 'chapel':
      return {
        title: t(`Eine ${name('chapel')} bauen`, `Build a ${inText(name('chapel'))}`),
        body: t(
          `Pioniere steigen nur zu ${tierName('settlers')}n auf, wenn eine ${name('chapel')} ihr Haus erreicht. Baue sie mitten in die Siedlung, ihr Umkreis zeigt sich beim Platzieren.`,
          `Pioneers only rise to ${inText(tierName('settlers'))} when a ${inText(name('chapel'))} reaches their house. Build it in the middle of the settlement; its range shows while placing.`,
        ),
      }
    case 'riseSettlers':
      return {
        title: t(`Aufstieg zu ${tierName('settlers')}n`, `Rise to ${tierName('settlers')}`),
        body: t(
          `Ein Haus steigt auf, wenn alle Bedürfnisse zu 100 % erfüllt sind und das Baumaterial im Lager liegt (${riseCost('settlers')} je Haus). ${riseRule()}`,
          `A house rises when all its needs are met at 100% and the building materials are in store (${riseCost('settlers')} per house). ${riseRule()}`,
        ),
      }
    case 'tavern':
      return {
        title: t(`${tierName('settlers')} wollen feiern`, `${tierName('settlers')} want to celebrate`),
        body: t(
          `Deine ${tierName('settlers')} brauchen ein ${name('tavern')} in ihrer Nähe. Fehlt es, herrscht Mangel und die Siedlung schrumpft.`,
          `Your ${inText(tierName('settlers'))} need a ${inText(name('tavern'))} nearby. Without it they suffer a shortage and the settlement shrinks.`,
        ),
      }
    case 'alcohol':
      return {
        title: t('Alkohol', 'Alcohol'),
        body: t(
          `${tierName('settlers')} trinken gern. Eine ${name('potato_farm')} liefert Schnaps. Wächst auf deiner Insel keine Kartoffel, nimm eine ${name('hops_farm')} und eine ${name('brewery')} oder kaufe Alkohol beim Händler.`,
          `${tierName('settlers')} like a drink. A ${inText(name('potato_farm'))} distills spirits. If potatoes do not grow on your island, use a ${inText(name('hops_farm'))} and a ${inText(name('brewery'))}, or buy alcohol from the trader.`,
        ),
      }
    case 'salt':
      return {
        title: t('Salz', 'Salt'),
        body: t(
          `${tierName('settlers')} wollen Salz. Eine ${name('salt_mine')} am Berg fördert Steinsalz, die ${name('saltworks')} macht Salz daraus. Später ersetzt Salz auch manche fehlenden Waren. Ohne Salzvorkommen kaufst du Salz mit dem Schiff beim Händler.`,
          `${tierName('settlers')} want salt. A ${inText(name('salt_mine'))} in the mountains digs rock salt and the ${inText(name('saltworks'))} makes salt from it. Later, salt also stands in for some missing goods. Without a salt deposit, buy salt from the trader with your ship.`,
        ),
      }
    case 'tools':
      return {
        title: t('Eigenes Werkzeug', 'Your own tools'),
        body: t(
          `Fast jedes Gebäude und jeder Aufstieg kostet Werkzeug, und der Vorrat vom Start geht zur Neige. Baue eine ${name('ore_mine')}, eine ${name('smelter')} und einen ${name('toolmaker')}. Schmelze und Werkzeugmacher brauchen auch Holz. Reicht das nicht, verkauft der Händler am Kontor Werkzeug.`,
          `Almost every building and every rise costs tools, and the starting supply is running low. Build an ${inText(name('ore_mine'))}, an ${inText(name('smelter'))} and a ${inText(name('toolmaker'))}. The smelter and the toolmaker also need wood. If that is not enough, the trader at the trading post sells tools.`,
        ),
      }
    case 'bricks':
      return {
        title: t('Ziegel', 'Bricks'),
        body: t(
          `Jeder Aufstieg und die ${name('church')} kosten Ziegel. Ein ${name('quarry')} am Berg liefert Stein, der ${name('stonemason')} macht Ziegel daraus. Auch Ziegel verkauft der Händler am Kontor.`,
          `Every rise and the ${inText(name('church'))} cost bricks. A ${inText(name('quarry'))} in the mountains provides stone and the ${inText(name('stonemason'))} makes bricks from it. The trader at the trading post sells bricks as well.`,
        ),
      }
    case 'growSettlers':
      return {
        title: t('Die Stadt wächst', 'The town grows'),
        body: t(
          `Für den nächsten Aufstieg brauchst du eine ${name('church')}. Es gibt sie, sobald ${unlockResidents('church')} Bewohner in Häusern der ${tierName('settlers')} oder höher leben. Baue weiter Häuser und halte alle Waren vorrätig.`,
          `The next rise needs a ${inText(name('church'))}. It becomes available once ${unlockResidents('church')} residents live in houses of ${inText(tierName('settlers'))} or higher. Keep building houses and keep all goods in stock.`,
        ),
      }
    case 'church':
      return {
        title: t(`Eine ${name('church')} bauen`, `Build a ${inText(name('church'))}`),
        body: t(
          `${tierName('citizens')} steigen nur zu ${tierName('merchants')}n auf, wenn eine ${name('church')} ihr Haus erreicht. Sie kostet viel Werkzeug und Ziegel. Baue sie mitten in die Stadt.`,
          `${tierName('citizens')} only rise to ${inText(tierName('merchants'))} when a ${inText(name('church'))} reaches their house. It costs a lot of tools and bricks. Build it in the middle of the town.`,
        ),
      }
    case 'riseCitizens':
      return {
        title: t(`Aufstieg zu ${tierName('citizens')}n`, `Rise to ${tierName('citizens')}`),
        body: t(
          `Sind alle Bedürfnisse zu 100 % erfüllt, steigen ${tierName('settlers')} auf. Je Haus brauchst du ${riseCost('citizens')}. ${riseRule()}`,
          `When all needs are met at 100%, ${inText(tierName('settlers'))} rise. Each house needs ${riseCost('citizens')}. ${riseRule()}`,
        ),
      }
    case 'citizenGoods':
      return {
        title: t('Tabak und Gewürze', 'Tobacco and spices'),
        body: t(
          `${tierName('citizens')} wollen Tabak und Gewürze. Sie wachsen nur in passendem Klima: Schau auf der Weltkarte nach einer Insel dafür und gründe dort mit Schiff und Kontor eine Kolonie, oder kaufe beim Händler. Bis dahin ersetzt Salz die fehlenden Waren.`,
          `${tierName('citizens')} want tobacco and spices. They only grow in a fitting climate: look for such an island on the world map and found a colony there with your ship and a trading post, or buy from the trader. Until then, salt stands in for the missing goods.`,
        ),
      }
    case 'riseMerchants':
      return {
        title: t(`Aufstieg zu ${tierName('merchants')}n`, `Rise to ${tierName('merchants')}`),
        body: t(
          `Versorgte ${tierName('citizens')} steigen zu ${tierName('merchants')}n auf. Je Haus brauchst du ${riseCost('merchants')}. Eine Handelsroute bringt Waren deiner Kolonien automatisch nach Hause.`,
          `Well-supplied ${inText(tierName('citizens'))} rise to ${inText(tierName('merchants'))}. Each house needs ${riseCost('merchants')}. A trade route brings the goods of your colonies home automatically.`,
        ),
      }
    case 'bathhouse':
      return {
        title: t(`Ein ${name('bathhouse')} bauen`, `Build a ${inText(name('bathhouse'))}`),
        body: t(
          `${tierName('merchants')} wollen ein ${name('bathhouse')} in ihrer Nähe. Es braucht Marmor: Baue einen ${name('marble_quarry')} und einen ${name('marble_mason')}.`,
          `${tierName('merchants')} want a ${inText(name('bathhouse'))} nearby. It needs marble: build a ${inText(name('marble_quarry'))} and a ${inText(name('marble_mason'))}.`,
        ),
      }
    case 'merchantGoods':
      return {
        title: t('Seide und Lampenöl', 'Silk and lamp oil'),
        body: t(
          `${tierName('merchants')} wollen Seide (${name('silk_plantation')}, ${name('indigo_farm')}, ${name('dyer')}) und Lampenöl (${name('whaler')}, ${name('oil_boiler')}). Fehlt das Klima, hol die Waren aus einer Kolonie.`,
          `${tierName('merchants')} want silk (${inText(name('silk_plantation'))}, ${inText(name('indigo_farm'))}, ${inText(name('dyer'))}) and lamp oil (${inText(name('whaler'))}, ${inText(name('oil_boiler'))}). If the climate does not fit, bring the goods from a colony.`,
        ),
      }
    case 'growMerchants':
      return {
        title: t('Auf dem Weg zum Adel', 'On the way to nobility'),
        body: t(
          `Ab ${unlockResidents('theater')} ${tierName('merchants')}n gibt es das ${name('theater')}, ab ${getTier('aristocrats').unlock?.residents ?? 0} das ${name('house_aristocrats')}.`,
          `At ${unlockResidents('theater')} ${inText(tierName('merchants'))} the ${inText(name('theater'))} becomes available, at ${getTier('aristocrats').unlock?.residents ?? 0} the ${inText(name('house_aristocrats'))}.`,
        ),
      }
    case 'theater':
      return {
        title: t(`Ein ${name('theater')} bauen`, `Build a ${inText(name('theater'))}`),
        body: t(
          `${tierName('aristocrats')} wollen ein ${name('theater')} in ihrer Nähe. Baue es dort, wo die Aristokratenhäuser stehen sollen.`,
          `${tierName('aristocrats')} want a ${inText(name('theater'))} nearby. Build it where the aristocrat houses are to stand.`,
        ),
      }
    case 'aristocrats':
      return {
        title: tierName('aristocrats'),
        body: t(
          `${tierName('aristocrats')}häuser entstehen nicht durch Aufstieg, du baust sie neu. Sie zahlen die meisten Steuern und mögen Schmuck und Wein. Aber Vorsicht: Bei Mangel verfallen sie zu Ruinen.`,
          `Aristocrat houses do not rise from other houses: you build them new. They pay the most taxes and like jewelry and wine. But beware: in a shortage they fall to ruins.`,
        ),
      }
    case 'finished':
      return {
        title: t('Geschafft', 'Well done'),
        body: t(
          'Du kennst jetzt alle Stufen deiner Inselwirtschaft. Viel Spaß beim Weiterbauen!',
          'You now know every tier of your island economy. Have fun as your islands keep growing!',
        ),
      }
    default:
      return { title: stepId, body: '' }
  }
}
