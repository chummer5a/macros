// Druid: Circle of Spores Symbiotic Entity
// Effects:
// Gain 4 temporary hit points for each level you have in this class.
// When you deal your Halo of Spores damage, roll the damage die a second time and add it to the total.
// Your melee weapon attacks deal an extra 1d6 poison damage to any target they hit.

//requires about-time, macro-marker, better rolls
let requiredModules = ["about-time", "betterrolls5e", "macro-marker"];
let missingModules = [];
requiredModules.forEach(function (module) {
  if (game.modules.get(module).active != true) {
    missingModules.push(module);
  }
});
if (missingModules === []) {
  return ui.notifications.error(
    `Required module(s) not found: ${missingModules.join(", ")}`
  );
}

//Configurable values
const featureName = "Circle of Spores: Symbiotic Entity";
const className = "Druid";
const dmgContext = "Circle of Spores";
const dmgArray = ["1d6", "poison"];
const tempHPMulti = 4;
// -------------

var token = null;
if (game.user.character == null) {
  token = canvas.tokens.controlled[0];
} else {
  token = game.user.character.getActiveTokens()[0];
}
if (token == null)
  return ui.notifications.error(
    "No viable token found. Not selected on canvas or default assigned to user."
  );
if (token.actor.data.items.find((i) => i.name === featureName) === undefined)
  return ui.notifications.error(
    `Feature not found. Does this character have the ${featureName} feature?`
  );
var classLevels = token.actor.data.items.find((i) => i.name == className)?.data
  ?.levels;
if (classLevels === undefined)
  return ui.notifications.error(
    `${className} class not found. Does this character have a class named ${className}?`
  );

if (token.actor.data.data.attributes.hp.temp > classLevels * 4) {
  return ui.notifications.error(
    "Character currently has more temp HP than this feature provides, so it cannot be used."
  );
}

if (MacroMarker.isActive(this, { token: token })) {
  token.actor.data.data.attributes.hp.temp = 0;
} else {
  //then() is used to prevent activating the feature from activating before confirming expenditure.
  game.dnd5e.rollItemMacro(featureName).then(() => {
    token.actor.data.data.attributes.hp.temp = classLevels * tempHPMulti;

    MacroMarker.activate(this, { token: token });
    var timeOutId = game.Gametime.doIn(
      game.Gametime.DMf({
        minutes: 10,
      }),
      () => {
        token.actor.data.data.attributes.hp.temp = 0;
        MacroMarker.deactivate(this, { token: token });
      }
    );
    toggleBonuses(true, token);
    var cancelId = game.Gametime.doEvery({ seconds: 6 }, () => {
      if (token.actor.data.data.attributes.hp.temp == 0) {
        toggleBonuses(false, token, this, [timeOutId, cancelId]);
      }
    });
  });
}

function toggleBonuses(
  enableBonus,
  token,
  markerObject = "",
  timeIds = undefined
) {
  //TODO: Not a big fan of this, but it works. Find all items that are melee weapon attack,
  // toggle bonus according to enableBonus. Remove the weapon damage type at index of the named value.
  var meleeWeapons = token.actor.items.filter(
    (i) => i.data.data.actionType == "mwak"
  );
  meleeWeapons.forEach(function (weapon) {
    let itemData = weapon.data;
    if (itemData.data.damage.parts.length > 0) {
      let hasContextDamage = false;
      let i = 0;
      for (i; i < itemData.data.damage.parts.length; i++) {
        if (itemData.flags.betterRolls5e.quickDamage.context[i] == dmgContext) {
          hasContextDamage = true;
          break;
        }
      }
      if (hasContextDamage && !enableBonus) {
        itemData.flags.betterRolls5e.quickDamage.context[i] = "";
        itemData.data.damage.parts.splice(i, 1);
      } else if (!hasContextDamage && enableBonus) {
        itemData.data.damage.parts.push(dmgArray);
        itemData.flags.betterRolls5e.quickDamage.context[i] = dmgContext;
      }
    }
  });
  if (timeIds) {
    timeIds.forEach(function (id) {
      game.Gametime.clearTimeout(id);
    });
    if (markerObject) {
      if (MacroMarker.isActive(markerObject, { token: token })) {
        MacroMarker.deactivate(markerObject, { token: token });
      }
    }
  }
}

function display(data = "") {
  if (data != "") {
    ChatMessage.create({
      user: game.user._id,
      content: data,
      speaker: speaker,
    });
  }
}
