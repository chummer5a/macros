// Macro to toggle the Mantle of Flame features:
// You shed bright light in a 30-foot radius and dim light for an additional 30 feet.
// TODO: UNIMPLEMENTED Any creature takes fire damage equal to your Charisma modifier ( (@abilities.cha.mod)) if it hits you with a melee attack from within 5 feet of you or if it touches you.
// Whenever you roll fire damage on your turn, the roll gains a bonus to equal to your Charisma modifier ( (@abilities.cha.mod)).

//requires about-time, furnace, better rolls
let requiredModules = ["about-time", "furnace", "macro-marker"];
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
if (
  token.actor.data.items.find((i) => i.name === "Mantle of Flame") === undefined
)
  return ui.notifications.error(
    "Feature not found. Does this character have the Mantle of Flame feature?"
  );

if (game.modules.get("macro-marker").active !== true)
  return ui.notifications.error(`MacroMarker isn't Loaded`);

if (MacroMarker.isActive(this, { entity: token })) {
  //TODO: Can't refer to @abilities during rolls?
  var chaMod = token.actor.data.data.abilities.cha.mod
  display(`Any creature takes fire damage equal to your Charisma modifier ([[/r ${chaMod}]]) if it hits you with a melee attack from within 5 feet of you or if it touches you.
Whenever you roll fire damage on your turn, the roll gains a bonus to equal to your Charisma modifier ([[/r ${chaMod}]]).`);
} else {
    game.dnd5e.rollItemMacro("Mantle of Flame").then(() => {
    let old_dimLight = token.dimLight;
    let old_brightLight = token.brightLight;
    //TODO: Should check if token has better lightsource than this
    token.update({
      dimLight: 60,
      brightLight: 30,
    });
    display(`${token.name} is surrounded by flames!`);
    MacroMarker.activate(this, { entity: token });
    game.Gametime.doIn(
      game.Gametime.DMf({
        minutes: 1,
      }),
      () => {
        token.update({
          dimLight: 0,
		  brightLight: 0,
		  //TODO: should work, doesn't.
          //dimLight: old_dimLight,
          //brightLight: old_brightLight,
        });
        display(`The swirling flames surrounding ${token.name} fade away...`);
        MacroMarker.deactivate(this, { entity: token });
      }
    );
    //TODO: Not a big fan of this, but it works. 
    //Find all items that have a damage type of 'fire' 
    //Copy the item's details, append +cha.mod, then revert in the appropriate duration.
    var fireItems = token.actor.items.entries
      .filter((i) => i.data.data.damage.parts[0] != undefined)
      .filter((i) => i.data.data.damage.parts[0][1] == "fire");

      fireItems.forEach(function (fire) {
      let qOld_damage = fire.data.data.damage.parts[0][0];
      var copy = duplicate(fire);
      copy.data.damage.parts[0][0] += "+@abilities.cha.mod";
      token.actor.updateEmbeddedEntity("OwnedItem", copy);
      game.Gametime.doIn({ minutes: 1 }, () => {
        copy.data.damage.parts[0][0] = qOld_damage;
        token.actor.updateEmbeddedEntity("OwnedItem", copy);
      });
    });
    game.Gametime.doIn({ minutes: 1 }, () => {
      MacroMarker.deactivate(this, { entity: token });
    });
  });
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
