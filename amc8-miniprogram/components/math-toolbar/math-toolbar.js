// components/math-toolbar/math-toolbar.js
Component({
  properties: {},
  data: {
    shortcuts: [
      { label: '\\frac', template: '\\frac{}{}' },
      { label: '\\sqrt', template: '\\sqrt{}' },
      { label: '^{}',    template: '^{}' },
      { label: '_{} ',   template: '_{}' },
      { label: '\\sum',  template: '\\sum_{i=1}^{n}' },
      { label: '\\int',  template: '\\int_{a}^{b}' },
      { label: '\\infty',template: '\\infty' },
      { label: '\\angle',template: '\\angle' },
      { label: '\\approx', template: '\\approx' },
      { label: '\\leq',  template: '\\leq' },
      { label: '\\geq',  template: '\\geq' },
      { label: '\\neq',  template: '\\neq' },
      { label: '\\cdot', template: '\\cdot' },
      { label: '\\times',template: '\\times' },
      { label: '\\div',  template: '\\div' },
      { label: '\\pm',   template: '\\pm' },
      { label: '\\pi',   template: '\\pi' },
      { label: '\\in',   template: '\\in' },
    ],
  },
  methods: {
    onInsert(e) {
      const tpl = e.currentTarget.dataset.tpl;
      this.triggerEvent('insert', { template: tpl });
    },
  },
});
