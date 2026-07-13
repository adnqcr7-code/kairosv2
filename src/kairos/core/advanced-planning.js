/**
 * Advanced Planning Module
 * Implements tree search, graph planning, and Monte Carlo exploration
 */

/**
 * Tree search node for planning
 */
class PlanNode {
  constructor(goal, action = null, parent = null) {
    this.goal = goal;
    this.action = action;
    this.parent = parent;
    this.children = [];
    this.cost = 0;
    this.estimatedValue = 0;
    this.visitCount = 0;
    this.exploredCount = 0;
  }

  addChild(node) {
    this.children.push(node);
    return node;
  }

  isLeaf() {
    return this.children.length === 0;
  }

  getPath() {
    const path = [];
    let node = this;
    while (node && node.action) {
      path.unshift(node.action);
      node = node.parent;
    }
    return path;
  }

  updateVisits(value) {
    this.visitCount += 1;
    this.estimatedValue = ((this.estimatedValue * (this.visitCount - 1)) + value) / this.visitCount;
  }
}

/**
 * Tree search planner using depth-first search with pruning
 */
class TreeSearchPlanner {
  constructor(goalDescription, maxDepth = 5, maxBranch = 3) {
    this.goalDescription = goalDescription;
    this.maxDepth = maxDepth;
    this.maxBranch = maxBranch;
    this.root = new PlanNode(goalDescription);
  }

  /**
   * Expand a node by generating possible actions
   */
  generateActions(node) {
    const actions = [];

    // Action templates based on goal type
    const actionTemplates = [
      { type: 'research', description: 'Research and gather information' },
      { type: 'plan', description: 'Create detailed plan' },
      { type: 'implement', description: 'Implement solution' },
      { type: 'test', description: 'Test and validate' },
      { type: 'review', description: 'Review and refine' },
      { type: 'document', description: 'Document findings' }
    ];

    for (const template of actionTemplates) {
      actions.push({
        type: template.type,
        description: template.description,
        estimatedCost: Math.random() * 100,
        estimatedValue: Math.random() * 10
      });
    }

    return actions;
  }

  /**
   * Evaluate node value (heuristic)
   */
  evaluateNode(node) {
    const depth = this.getNodeDepth(node);
    const depthPenalty = 0.1 * depth;
    return Math.max(0, 5 + Math.random() - depthPenalty);
  }

  /**
   * Get depth of node from root
   */
  getNodeDepth(node) {
    let depth = 0;
    let current = node;
    while (current.parent) {
      depth += 1;
      current = current.parent;
    }
    return depth;
  }

  /**
   * Perform depth-first search with pruning
   */
  search() {
    const stack = [this.root];
    const visited = new Set();
    const plans = [];

    while (stack.length > 0) {
      const node = stack.pop();
      const nodeId = JSON.stringify(node.goal);

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const depth = this.getNodeDepth(node);

      // Pruning: stop if max depth reached
      if (depth >= this.maxDepth) {
        const planValue = this.evaluateNode(node);
        node.updateVisits(planValue);
        plans.push({
          path: node.getPath(),
          value: planValue,
          cost: depth
        });
        continue;
      }

      // Generate possible actions
      const actions = this.generateActions(node);
      const sortedActions = actions.sort((a, b) => b.estimatedValue - a.estimatedValue);
      const topActions = sortedActions.slice(0, this.maxBranch);

      for (const action of topActions) {
        const childNode = new PlanNode(
          `${node.goal} -> ${action.type}`,
          action,
          node
        );
        node.addChild(childNode);
        stack.push(childNode);
      }
    }

    return plans.sort((a, b) => b.value - a.value).slice(0, 3);
  }
}

/**
 * Graph-based planner for handling dependencies
 */
class GraphPlanner {
  constructor(goal) {
    this.goal = goal;
    this.nodes = [];
    this.edges = [];
    this.constraints = [];
  }

  /**
   * Add a task node to the graph
   */
  addTask(id, description, estimatedCost = 1, dependencies = []) {
    const node = {
      id,
      description,
      estimatedCost,
      dependencies,
      completed: false,
      startTime: null,
      endTime: null
    };

    this.nodes.push(node);

    // Add edges for dependencies
    for (const dep of dependencies) {
      this.edges.push({ from: dep, to: id });
    }

    return node;
  }

  /**
   * Add a constraint
   */
  addConstraint(constraint) {
    this.constraints.push(constraint);
  }

  /**
   * Get topological sort of tasks
   */
  topologicalSort() {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected for ${nodeId}`);
      }

      visiting.add(nodeId);

      const node = this.nodes.find((n) => n.id === nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          visit(depId);
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      sorted.push(nodeId);
    };

    for (const node of this.nodes) {
      visit(node.id);
    }

    return sorted.map((id) => this.nodes.find((n) => n.id === id)).filter(Boolean);
  }

  /**
   * Calculate critical path
   */
  getCriticalPath() {
    const sorted = this.topologicalSort();
    const times = {};
    const earliestStart = {};
    const earliestFinish = {};

    // Forward pass
    for (const node of sorted) {
      const deps = node.dependencies.map((d) => earliestFinish[d] || 0);
      earliestStart[node.id] = deps.length > 0 ? Math.max(...deps) : 0;
      earliestFinish[node.id] = earliestStart[node.id] + node.estimatedCost;
    }

    // Find critical path (longest path)
    const criticalPath = [];
    let maxTime = 0;
    let criticalNode = null;

    for (const node of sorted) {
      if (earliestFinish[node.id] >= maxTime) {
        maxTime = earliestFinish[node.id];
        criticalNode = node;
      }
    }

    // Backtrack to build path
    let current = criticalNode;
    while (current) {
      criticalPath.unshift(current.id);
      const deps = current.dependencies.filter((d) => {
        const depNode = this.nodes.find((n) => n.id === d);
        return depNode && earliestFinish[d] === earliestStart[current.id];
      });
      current = deps.length > 0 ? this.nodes.find((n) => n.id === deps[0]) : null;
    }

    return {
      path: criticalPath,
      duration: maxTime,
      tasks: criticalPath.map((id) => this.nodes.find((n) => n.id === id))
    };
  }

  /**
   * Export plan as executable steps
   */
  getPlan() {
    const sorted = this.topologicalSort();
    const criticalPath = this.getCriticalPath();

    return {
      tasks: sorted,
      criticalPath: criticalPath.path,
      estimatedDuration: criticalPath.duration,
      constraint: this.constraints
    };
  }
}

/**
 * Monte Carlo Tree Search for exploration
 */
class MonteCarloPlanner {
  constructor(goal, maxIterations = 100) {
    this.goal = goal;
    this.maxIterations = maxIterations;
    this.root = new PlanNode(goal);
    this.histories = [];
  }

  /**
   * Random simulation (rollout)
   */
  simulate(node, depth = 0) {
    if (depth >= 5) {
      return Math.random() * 10;
    }

    const actions = ['research', 'plan', 'implement', 'test', 'review'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const childNode = new PlanNode(`${node.goal} -> ${randomAction}`, { type: randomAction }, node);

    return this.simulate(childNode, depth + 1);
  }

  /**
   * UCB1 calculation for balancing exploration/exploitation
   */
  calculateUCB1(node, parentVisits) {
    if (node.visitCount === 0) return Number.MAX_VALUE;

    const exploitationTerm = node.estimatedValue;
    const c = Math.sqrt(2); // exploration constant
    const explorationTerm = c * Math.sqrt(Math.log(parentVisits) / node.visitCount);

    return exploitationTerm + explorationTerm;
  }

  /**
   * Run MCTS iterations
   */
  search() {
    for (let i = 0; i < this.maxIterations; i++) {
      // Selection & Expansion
      let node = this.root;
      const path = [node];

      while (!node.isLeaf() && node.visitCount > 0) {
        const best = node.children.reduce((max, child) => {
          const ucb = this.calculateUCB1(child, node.visitCount);
          return ucb > this.calculateUCB1(max, node.visitCount) ? child : max;
        });
        node = best;
        path.push(node);
      }

      // Expansion
      if (node.visitCount > 0 && node.children.length < 3) {
        const newNode = new PlanNode(`${node.goal} -> expand`, null, node);
        node.addChild(newNode);
        path.push(newNode);
        node = newNode;
      }

      // Simulation
      const value = this.simulate(node);

      // Backpropagation
      for (const pathNode of path) {
        pathNode.updateVisits(value);
      }

      this.histories.push({
        iteration: i,
        value,
        pathLength: path.length
      });
    }

    // Return best paths
    const sortedChildren = this.root.children.sort((a, b) => b.estimatedValue - a.estimatedValue);
    return sortedChildren.slice(0, 3).map((node) => ({
      path: node.getPath(),
      value: Math.round(node.estimatedValue * 100) / 100,
      visits: node.visitCount
    }));
  }
}

/**
 * Main advanced planner interface
 */
function createAdvancedPlan(goal, method = 'tree') {
  if (method === 'tree') {
    const planner = new TreeSearchPlanner(goal);
    return planner.search();
  }

  if (method === 'graph') {
    const planner = new GraphPlanner(goal);
    // Generate sample tasks
    planner.addTask('research', 'Research requirements', 2);
    planner.addTask('design', 'Design solution', 3, ['research']);
    planner.addTask('implement', 'Implement', 5, ['design']);
    planner.addTask('test', 'Test solution', 2, ['implement']);
    planner.addTask('review', 'Code review', 1, ['test']);
    return planner.getPlan();
  }

  if (method === 'monte-carlo') {
    const planner = new MonteCarloPlanner(goal, 100);
    return planner.search();
  }

  throw new Error(`Unknown planning method: ${method}`);
}

module.exports = {
  createAdvancedPlan,
  GraphPlanner,
  MonteCarloPlanner,
  PlanNode,
  TreeSearchPlanner
};
