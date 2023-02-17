    interface Distance { a: number, b: number, distance: number };
    interface Factory { entityId: number, owner: number, population: number, production: number, allocatedForThisRound: number };
    interface Troop { owner: number, from: number, to: number, count: number, distanceFromTarget: number };
    interface StrategicState { factory: Factory, priority: number, requiredTroops: number };

    abstract class Action {
        type: string;
        abstract getParameters(): any[];
        toString(): string { return [this.type].concat(this.getParameters()).join(' '); }
    }

    class MoveAction extends Action {
        type = 'MOVE';
        constructor(private from: number, private to: number, private amount: number) { super(); }
        getParameters(): any[] { return [this.from, this.to, this.amount]; }
    }

    class BombAction extends Action {
        type = 'BOMB';
        constructor(private from: number, private to: number) { super(); }
        getParameters(): any[] { return [this.from, this.to]; }
    }

    class MessageAction extends Action {
        type = 'MSG'
        constructor(private msg: string) { super(); }
        getParameters(): any[] { return [this.msg]; }
    }

    const distances: Distance[] = [];
    const factories: Factory[] = [];
    let troops: Troop[] = [];

    let round = 0;
    // todo use 2 bombs, 5 rounds cooldown
    // bomb base, tnen attack
    // todo avoid enemy bombs
    // todo typed actions, msg GL, HF!
    let bombs = 2;

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
        troops = [];

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
                currentFactory.allocatedForThisRound = 0;
                currentFactory.production = arg3;
            }

            if (entityType === 'TROOP') {
                troops.push({ owner: arg1, from: arg2, to: arg3, count: arg4, distanceFromTarget: arg5 });
            }
        }

        // TODO : ignore 0-production factories, more aggresive conquer of neutrals (control already dispatched troops) consider distances

        // see which bases we can conquer
        // consider troops in movement {own and enemy}
        // bomb only strongest bases, then conquer
        // pay much more attention to distance !!

        const operations: Action[] = [];

        const strategicState: StrategicState[] = [];

        factories.forEach(factory => {
            const state = calculateStrategicState(factory);
            // console.error("Calculated state: " + JSON.stringify(state));
            strategicState.push(state)
        });

        strategicState.sort((a, b) => b.priority - a.priority);

        // strategicState.forEach(item => console.error(JSON.stringify(item)));

        strategicState.forEach(factoryState => {
            const availablePopulation = getAvailablePopulation();
            // console.error("Targeting " + JSON.stringify(factoryState) + " available troops: " + availablePopulation);
            if (availablePopulation >= factoryState.requiredTroops) {
                let closeFactories = sortByClosestDistance(getOwnedFactories(), factoryState.factory.entityId);
                let allocatedTroops = 0;
                closeFactories.forEach(ownFactory => {
                    allocatedTroops += askTroops(ownFactory, factoryState.factory.entityId, factoryState.requiredTroops - allocatedTroops, operations);
                });
                // console.error("Factory " + JSON.stringify(factoryState) + " shall be conquered.");
            } else {
                // console.error("Factory " + JSON.stringify(factoryState) + " cannot be conquered");
            }
        });

        if (shouldDispatchBomb()) {
            bombs--;
            const enemyFactories = getEnemyFactories();
            const strongestEnemyFactory = sortByProduction(enemyFactories)[0];
            const closestOwnBase = sortByClosestDistance(getOwnedFactories(), strongestEnemyFactory)[0];
            operations.push(new BombAction(closestOwnBase, strongestEnemyFactory));
        }

        if (round === 1) {
            operations.push(new MessageAction("GL, HF!"))
        }

        if (operations.length > 0) {
            console.log(operations.map(o => o.toString()).join(';'));
        } else {
            console.log('WAIT')
        }
    }

    // 
    // GAME DATA FUNCTIONS
    // 
    function getOwnedFactories(): number[] {
        return getFactoriesByOwner([1]);
    }

    function getEnemyFactories(): number[] {
        return getFactoriesByOwner([-1]);
    }

    function getFactoriesByOwner(ownerCodes: number[]): number[] {
        return factories.filter(item => ownerCodes.includes(item.owner)).map(item => item.entityId);
    }

    function getFactory(entityId: number): Factory {
        if (factories.some(item => item.entityId === entityId)) {
            return factories.find(item => item.entityId === entityId)!;
        } else {
            let newFactory: Factory = { entityId, owner: 0, population: 0, production: 0, allocatedForThisRound: 0 };
            factories.push(newFactory);
            return newFactory;
        }
    }

    function getDestinations(selectedFactory: number): number[] {
        let destinations = [] as number[];
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

    function getAvailablePopulation(): number {
        return getOwnedFactories()
        .map(id => getFactory(id))
        .map(factory => factory.population - factory.allocatedForThisRound)
        .reduce((prev, current) => prev + current, 0);
    }

    function getDistance(a: number, b: number): number {
        return distances.find(item => (item.a === a && item.b == b) || (item.a === b && item.b === a))?.distance || 1000000;
    }


    // 
    // STRATEGY
    // 
    function calculateStrategicState(factory: Factory): StrategicState {
        const priority = factory.production + (20- getDistanceFromOwnBases(factory));
        const requiredTroops = getRequiredTroops(factory)
        return {factory, priority, requiredTroops};
    }

    function getDistanceFromOwnBases(factory: Factory): number {
        const ownFactories = getOwnedFactories().filter(id => id !== factory.entityId);
        return Math.floor(ownFactories.map(id => getDistance(factory.entityId, id)).reduce((a, b) => a + b, 0) / ownFactories.length) || 0;
    }

    // Todo also account for factory production
    function getRequiredTroops(factory: Factory): number {
        let result = factory.population;
        // Require positive number for enemy and neutral, negative for own troops.
        if (factory.owner === 1) {
            result *= -1
        }
        troops.forEach(troop => {
            if (troop.to === factory.entityId) {
                result += troop.count * (troop.owner === 1 ? -1 : 1);
                // console.error("Accounted for troop "+JSON.stringify(troop)+", heading to factory "+JSON.stringify(factory)+". Currently required troops: "+result)
            }
        })
        if (result > 1) {
            result++;
        }
        // console.error("Counted " + result + " enemy troops (including incoming) for factory " + JSON.stringify(factory))
        return result;
    }

    // 
    // ACTIVE GAME OPERATIONS
    // 
    // todo keep units under attack
    function askTroops(from: number, to: number, maxTroops: number, opertations: Action[]): number {
        let factory = getFactory(from);
        let providedTroops = Math.min(factory.population, maxTroops);
        factory.allocatedForThisRound += providedTroops;
        if (providedTroops > 0) {
            // console.error("Providing " + providedTroops + " troops from " + JSON.stringify(factory) + " to " + to);
            opertations.push(new MoveAction(from, to, providedTroops));
        }
        return providedTroops;
    }

    // 
    // BOMB
    // 
    function shouldDispatchBomb(): boolean {
        return bombAvailable() && (round === 1 || round === 6);
        // Only bomb the strongest base
        // Do not bomb the same base before 5 rounds
    }

    function bombAvailable(): boolean {
        return bombs > 0;
    }

    // 
    // SORTING
    // 
    function sortByPopulation(factoryIds: number[]): number[] {
        return sortFactories(factoryIds, (a, b) => b.population - a.population);
    }

    function sortByPreferedType(factoryIds: number[], typeOrder: number[]): number[] {
        return sortFactories(factoryIds, (a, b) => typeOrder.indexOf(a.owner) - typeOrder.indexOf(b.owner));
    }

    function sortByProduction(factoryIds: number[]): number[] {
        return sortFactories(factoryIds, (a, b) => b.production - a.production);
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

    function filterFactories(factoryIds: number[], filterFn: (a: Factory) => boolean): number[] {
        return factoryIds
            .map(id => getFactory(id))
            .filter(filterFn)
            .map(factory => factory.entityId);
    }
