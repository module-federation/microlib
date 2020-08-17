import { withId, withTimestamp } from './mixins';
import asyncPipe from '../lib/async-pipe';
import uuid from '../lib/uuid';
const utc = () => new Date().toUTCString();

/**
 * @typedef {Object} Model
 * @property {Function} getModelName
 * @property {String} id
 * @property {String} created
 */

const Model = (() => {

  const Model = ({ factory, args, modelName }) => {
    return Promise.resolve(
      factory(args)
    ).then(model => ({
      modelName: modelName,
      getModelName: () => modelName,
      ...model
    }));
  };

  const makeModel = asyncPipe(
    Model,
    withTimestamp(utc),
    withId(uuid),
  );

  return {
    /**
     * 
     * @param {{factory: Function, args: any, modelName: String}} options 
     * @returns {Model}
     */
    create: async function (options) {
      return await makeModel(options);
    }
  }
})();

export default Model;

// const factFunc = (val1) => {
//   return {
//     var1: val1,
//     isValid: function () {
//       return val1 !== 'undefined';
//     }
//   };
// }

// const m = Model.create({
//   factory: factFunc,
//   args: 'arg1',
//   modelName: 'model1'
// });
// console.log(m);
// console.log(`getModelName: ${m.getModelName()}`);
// console.log(`isValid: ${m.isValid()}`);

