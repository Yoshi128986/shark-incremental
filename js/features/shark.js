const SHARK = {
    cost(l=player.shark_level) { return Decimal.pow(tmp.shark_req_base,l.mul(tmp.shark_scale_str).scale(100,3,3).scale(tmp.scale_shark1,2,0)).root(coreReactorEffect(3)) },
    bulk(x=player.fish) { return x.pow(coreReactorEffect(3)).log(tmp.shark_req_base).scale(tmp.scale_shark1,2,0,true).scale(100,3,3,true).div(tmp.shark_scale_str).floor().add(1) },

    bonuses: {
        fish: [()=>player.shark_level.gte(1),l=>Decimal.pow(tmp.shark_base,l).mul(l),E(0)],
        prestige: [()=>player.shark_level.gte(20),l=>Decimal.add(1.25,simpleResearchEffect('p1',0)).pow(l.sub(19)),E(1)],
        core: [()=>player.shark_level.gte(300),l=>Decimal.pow(1.01,l.sub(299)),E(1)],
    },

    bonus() {
        let l = player.shark_level, b = {}
        b.fish = Decimal.pow(2,l).mul(l)
        return b
    },
}

const SHARK_UPGRADES = {
    s1: {
        req: ()=>player.shark_level.gte(3),

        cost: l => Decimal.pow(1.1,l).mul(100),
        bulk: x => x.div(100).log(1.1).floor().add(1),

        curr: "fish",

        effect: l=>l.add(1).pow(sharkUpgEffect('s3')),
        effDesc: x=>formatMult(x),
    },
    s2: {
        req: ()=>player.shark_level.gte(7),

        cost: l => Decimal.pow(10,l.pow(1.25)).mul(1e6),
        bulk: x => x.div(1e6).log(10).root(1.25).floor().add(1),

        curr: "fish",

        effect: l=>l,
        effDesc: x=>"+"+format(x,0),
    },
    s3: {
        req: ()=>player.shark_level.gte(15),

        cost: l => {
            let x = Decimal.pow(1e3,l.scale(30,hasDepthMilestone(2,0) ? 2.75 : 3,3).pow(1.25)).mul(1e21)
            if (hasResearch('c3')) x = x.root(coreReactorEffect(3))
            return x
        },
        bulk: x => {
            if (hasResearch('c3')) x = x.pow(coreReactorEffect(3))
            return x.div(1e21).log(1e3).root(1.25).scale(30,hasDepthMilestone(2,0) ? 2.75 : 3,3,true).floor().add(1)
        },

        curr: "fish",

        effect: l=>l.div(2).add(1),
        effDesc: x=>formatPow(x),
    },
    s4: {
        unl: ()=>hasResearch('p3'),
        req: ()=>player.shark_level.gte(38),

        cost: l => {
            let x = Decimal.pow(1e5,l.scale(10,hasDepthMilestone(2,0) ? 2.75 : 3,3).pow(1.25)).mul(1e135)
            if (hasResearch('c3')) x = x.root(coreReactorEffect(3))
            return x
        },
        bulk: x => {
            if (hasResearch('c3')) x = x.pow(coreReactorEffect(3))
            return x.div(1e135).log(1e5).root(1.25).scale(10,hasDepthMilestone(2,0) ? 2.75 : 3,3,true).floor().add(1)
        },

        curr: "fish",

        effect: l=>l.div(100).add(1),
        effDesc: x=>formatPow(x),
    },
    p1: {
        req: ()=>player.prestige.times>0,

        cost: l => Decimal.pow(2,l.pow(1.1)).ceil(),
        bulk: x => x.log(2).root(1.1).floor().add(1),

        curr: "prestige",

        effect: l=>Decimal.pow(3,l.mul(simpleResearchEffect('p5'))),
        effDesc: x=>formatMult(x,0),
    },
    p2: {
        req: ()=>player.prestige.times>0,

        cost: l => Decimal.pow(10,l.pow(1.25)).mul(1e3),
        bulk: x => x.div(1e3).log(10).root(1.25).floor().add(1),

        curr: "prestige",

        effect: l=>Decimal.pow(player.fish.add(10).log10(),l),
        effDesc: x=>formatMult(x),
    },
    p3: {
        unl: ()=>hasResearch('p3'),

        cost: l => {
            let x = Decimal.pow(1e6,l.pow(2)).mul(1e33)
            if (hasResearch('c3')) x = x.root(coreReactorEffect(3))
            return x
        },
        bulk: x => {
            if (hasResearch('c3')) x = x.pow(coreReactorEffect(3))
            return x.div(1e33).log(1e6).root(2).floor().add(1)
        },

        curr: "prestige",

        effect: l=>l.mul(hasResearch("p6")?2:1),
        effDesc: x=>"+"+format(x,0),
    },
}

function buySharkUpgrade(i) {
    const u = SHARK_UPGRADES[i]

    if (tmp.su_locked[u.curr] || u.unl && !u.unl() || u.req && !u.req()) return;

    let cost = u.cost(player.shark_upg[i]), curr = CURRENCIES[u.curr]

    if (curr.amount.gte(cost)) {
        if (!tmp.su_el[u.curr]) curr.amount = curr.amount.sub(cost).max(0)
        player.shark_upg[i] = player.shark_upg[i].add(1)
    }
}
function buyMaxSharkUpgrade(i) {
    const u = SHARK_UPGRADES[i]

    if (tmp.su_locked[u.curr] || u.unl && !u.unl() || u.req && !u.req()) return;

    let cost = u.cost(player.shark_upg[i]), curr = CURRENCIES[u.curr]

    if (curr.amount.gte(cost)) {
        let bulk = u.bulk(curr.amount)
        if (bulk.gt(player.shark_upg[i])) {
            player.shark_upg[i] = bulk
            if (!tmp.su_el[u.curr]) {
                cost = u.cost(bulk.sub(1))
                curr.amount = curr.amount.sub(cost).max(0)
            }
        }
    }
}

function buyAllSharkUpgrades(ii=[]) {
    ii.forEach(i=>buyMaxSharkUpgrade(i))
}

function updateSharkTemp() {
    var l = {}

    if (inExploration(3)) {
        l.fish = true
        l.prestige = true
    }

    tmp.su_locked = l

    tmp.su_el.fish = hasResearch('p2')
    tmp.su_el.prestige = hasDepthMilestone(1,2)

    for (let [i,v] of Object.entries(SHARK_UPGRADES)) tmp.shark_upg_eff[i] = v.effect(player.shark_upg[i])

    tmp.shark_base = sharkUpgEffect('s2').add(2)
    tmp.shark_scale_str = inExploration(2) ? 10 : 1
    tmp.shark_req_base = Decimal.sub(10,researchEffect('p3',0))
    tmp.scale_shark1 = Decimal.add(10,sharkUpgEffect('p3',0)).add(hasDepthMilestone(2,2)?player.explore.depth[2].div(500).floor():0)

    for (let [i,v] of Object.entries(SHARK.bonuses)) tmp.shark_bonus[i] = v[0]() ? v[1](player.shark_level) : v[2]
}

function updateSharkHTML() {
    el('shark-level').textContent = player.shark_level.format(0)

    let cost = SHARK.cost()

    el('shark-button').innerHTML = lang_text('upgrade-shark',cost)
    el('shark-button').className = el_classes({locked: player.fish.lt(cost)})

    el('shark-bonus').innerHTML = Object.keys(SHARK.bonuses).filter(x=>SHARK.bonuses[x][0]()).map(x=>lang_text("shark-bonus-"+x,getSharkBonus(x))).join(", ")

    var cost_text = lang_text('cost'), effect_text = lang_text('effect')

    for (let [i,v] of Object.entries(SHARK_UPGRADES)) {
        let unl = !v.unl || v.unl()
        el('shark-upgrade'+i+'-div').style.display = el_display(unl)

        if (!unl) continue;
    
        let req = true
        if (v.req) {
            req = v.req()
            el('su-'+i+'-req-div').style.display = el_display(!req)
            el('su-'+i+'-info').style.display = el_display(req)
        }

        if (!req) continue;

        let amt = player.shark_upg[i], cost = v.cost(amt)

        el('su-'+i+'-level').textContent = amt.format(0)

        el('su-'+i+'-cost').innerHTML = tmp.su_locked[v.curr] ? `Locked` : `${cost_text}: ${cost.format(0)} ${CURRENCIES[v.curr].costName}`
        el('su-'+i+'-cost').className = el_classes({'shark-upgrade-button': true, locked: tmp.su_locked[v.curr] || CURRENCIES[v.curr].amount.lt(cost)})

        el('su-'+i+'-desc').innerHTML = lang_text('su-'+i+'-desc')+"<br>"+effect_text+": <b>"+v.effDesc(tmp.shark_upg_eff[i])+"</b>"
    }
}

function upgradeShark(auto) {
    let cost = SHARK.cost()
    if (player.fish.gte(cost)) {
        let bulk = player.shark_level.add(1)
        if (auto) {
            bulk = SHARK.bulk()
            cost = SHARK.cost(bulk.sub(1))
        }
        if (!hasDepthMilestone(0,2)) player.fish = player.fish.sub(cost).max()
        player.shark_level = bulk
    }
}

function getSharkBonus(id,def=E(1)) { return tmp.shark_bonus[id] ?? def }
function sharkUpgEffect(id,def=E(1)) { return tmp.shark_upg_eff[id] ?? def }

function setupSharkHTML() {
    let h = ""

    for (let [i,v] of Object.entries(SHARK_UPGRADES)) {
        h += `
        <div class="shark-upgrade" id="shark-upgrade${i}-div">
            <div class="shark-upgrade-div" id="su-${i}-info">
                <div><h2>${lang_text('su-'+i+'-name')}</h2><br>${lang_text('level')}: <span id="su-${i}-level">0</span></div>
                <div id="su-${i}-desc">x???</div>
                <div class="shark-upgrade-buttons"><button id="su-${i}-cost" onclick="buySharkUpgrade('${i}')">Cost: ???</button><button onclick="buyMaxSharkUpgrade('${i}')">${lang_text('buyMax')}</button></div>
            </div>
            ${v.req ? `<div class="shark-upgrade-requirement" id="su-${i}-req-div"><div>${lang_text('su-'+i+'-req')}</div></div>` : ""}
        </div>
        `
    }

    el('shark-upgrades').innerHTML = h
}

function resetSharkUpgrades(...id) {
    id.forEach(x => {player.shark_upg[x] = E(0)})
}