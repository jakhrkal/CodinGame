/**
 * Auto-generated code below aims at helping you parse
 * the standard input according to the problem statement.
 **/

interface Distance { a: number, b: number, distance: number };
interface Factory { entityId: number, owner: number, population: number, production: number };

const distances = [] as Distance[];
const factories = [] as Factory[];
let round = 0;
// todo use 2 bombs, 5 rounds cooldown
let bombs = 1;

const factoryCount: number = parseInt(readline()); // the number of factories
const linkCount: number = parseInt(readline()); // the number of links between factories

for (let i = 0; i < linkCount; i++) {
    var inputs: string[] = readline().split(' ');
    const factory1: number = parseInt(inputs[0]);
    const factory2: number = parseInt(inputs[1]);
    const distance: number = parseInt(inputs[2]);
    distances.push({ a: factory1, b: factory2, distance });
}

// game loop
while (true) {
    round++;

    let result = {
        source: 0,
        target: 0,
        count: 0
    };

    const entityCount: number = parseInt(readline()); // the number of entities (e.g. factories and troops)
    for (let i = 0; i < entityCount; i++) {
        var inputs: string[] = readline().split(' ');
        const entityId: number = parseInt(inputs[0]);
        const entityType: string = inputs[1];
        const arg1: number = parseInt(inputs[2]);
        const arg2: number = parseInt(inputs[3]);
        const arg3: number = parseInt(inputs[4]);
        const arg4: number = parseInt(inputs[5]);
        const arg5: number = parseInt(inputs[6]);

        if (entityType === 'FACTORY') {
            let currentFactory = getFactory(entityId);
            currentFactory.owner = arg1;
            currentFactory.population = arg2;
            currentFactory.production = arg3;
        }
    }

    // TODO : ignore 0-production factories, more aggresive conquer of neutrals (control already dispatched troops) consider distances

    // Find most populated factory
    let ownedFactories = getOwnedFactories();
    let factoriesByPopulation = sortByPopulation(ownedFactories);
    let selectedFactory = factoriesByPopulation[0];

    // Select less populated destinations
    let possibleDestinations = sortByPopulation(getDestinations(selectedFactory));
    // Prefer greater production
    let destinationsByProduction = sortByProduction(possibleDestinations);
    // Prefer neutral factories first
    let destinationsByType = sortByPreferedType(destinationsByProduction, [1, -1, 0])
    let selectedDestination = destinationsByType.pop();

    // Write an action using console.log()
    // To debug: console.error('Debug messages...');

    // Any valid action, such as "WAIT" or "MOVE source destination cyborgs"
    if (bombAvailable()) {
        bombs--;
        const enemyFactories = getEnemyFactories();
        const strongestEnemyFactory = sortByProduction(enemyFactories)[0];
        const closestOwnBase = sortByClosestDistance(ownedFactories, strongestEnemyFactory)[0];
        console.log('BOMB ' + closestOwnBase + ' ' + strongestEnemyFactory);
    } else if (getPopulation(selectedFactory) > (getPopulation(selectedDestination) + 1)) {
        console.log('MOVE ' + selectedFactory + ' ' + selectedDestination + ' ' + getPopulation(selectedDestination) + 1);
    } else {
        console.log('WAIT')
    }
}

function getOwnedFactories(): number[] {
    return factories.filter(item => item.owner === 1).map(item => item.entityId);
}

function getEnemyFactories(): number[] {
    return factories.filter(item => item.owner === -1).map(item => item.entityId);
}

function getFactory(entityId: number): Factory {
    if (factories.some(item => item.entityId === entityId)) {
        return factories.find(item => item.entityId === entityId);
    } else {
        let newFactory = { entityId, owner: 0, population: 0, production: 0 };
        factories.push(newFactory);
        return newFactory;
    }
}

function getDestinations(selectedFactory: number): number[] {
    let destinations = [];
    distances.forEach(dist => {
        if (dist.a === selectedFactory) {
            destinations.push(dist.b);
        }
        if (dist.b === selectedFactory) {
            destinations.push(dist.a);
        }
    });
    return destinations;
}

function getPopulation(factoryId: number): number {
    return getFactory(factoryId).population;
}

function getDistance(a: number, b: number): number {
    return distances.find(item => (item.a === a && item.b == b) || (item.a === b && item.b === a))?.distance || 1000000;
}

function bombAvailable(): boolean {
    return bombs > 0;
}

function sortByPopulation(factoryIds: number[]): number[] {
    return sortFactories(factoryIds, (a, b) => b.population - a.population);
}

function sortByPreferedType(factoryIds: number[], typeOrder: number[]): number[] {
    return sortFactories(factoryIds, (a, b) => typeOrder.indexOf(a.owner) - typeOrder.indexOf(b.owner));
}

function sortByProduction(factoryIds: number[]): number[] {
    return sortFactories(factoryIds, (a, b) => a.production - b.production);
}

function sortByClosestDistance(candidates: number[], target: number): number[] {
    return getDestinations(target)
        .filter(dest => candidates.includes(dest))
        .sort((a, b) => getDistance(b, target) - getDistance(a, target));
}

function sortFactories(factoryIds: number[], sortFn: (a: Factory, b: Factory) => number): number[] {
    return factoryIds
        .map(id => getFactory(id))
        .sort(sortFn)
        .map(factory => factory.entityId);
}
