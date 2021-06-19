"use strict";

import ModelFactory from "./index";
import domainEvents from "./domain-events";

export const relationType = {
  /**
   * @todo implement cache miss for distributed cache
   *
   * @param {import("../models/model-factory").Model} model
   * @param {import("../datasources/datasource").default} ds
   * @param {import("./index").relations[relation]} rel
   */
  oneToMany: async (model, ds, rel) => {
    const pk = model.id || model.getId();
    return ds.list({ [rel.foreignKey]: pk });
  },
  /**
   *
   * @param {import("../models").Model} model
   * @param {import("../datasources/datasource").default} ds
   * @param {import("./index").relations[relation]} config
   */
  manyToOne: async (model, ds, rel) => await ds.find(model[rel.foreignKey]),
  /**
   * Same as many to one as far as the lookup.
   * @param {*} model
   * @param {*} ds
   * @param {*} rel
   * @returns
   */
  oneToOne(model, ds, rel) {
    return this.manyToOne(model, ds, rel);
  },
  /**
   * Used for transparent integration.
   * @param {*} model
   * @param {*} ds
   * @param {*} rel
   * @returns
   */
  oneToAny(model, ds, rel) {
    return ds.list({ count: 1 });
  },
};

function isLocalObject(modelName) {
  if (!ModelFactory.getModelSpec(modelName)) {
    console.warn("non-local or invalid model", modelName);
    return false;
  }
  return true;
}

/**
 * Retrieve a remote object instance from the distributed cache.
 * If a relation specifies an object we don't have, broadcast a
 * global inquiry specifying the relation for other hosts to run.
 * If found on another host, it is sent back to us in an event.
 * The caller waits until either that happens or we timeout.
 *
 * @param {import(".").relations[x]} relation
 * @param {import("./observer").Observer} observer
 * @returns
 */
function requireRemoteObject(model, relation, observer) {
  const inquiry = domainEvents.remoteObjectInquiry(relation.modelName);
  const located = domainEvents.remoteObjectLocated(relation.modelName);
  const proceed = fn => () => fn();

  const promise = new Promise(function (resolve) {
    setTimeout(resolve, 10000);
    return observer.on(located, proceed(resolve));
  });

  observer.notify(inquiry, {
    eventName: inquiry,
    relation,
    model,
  });

  return promise;
}

/**
 * Generate functions to retrieve related domain objects.
 * @param {import("./index").relations} relations
 * @param {*} dataSource
 */
export default function makeRelations(relations, dataSource, observer) {
  if (Object.getOwnPropertyNames(relations).length < 1) return;

  // Listen for inquiries about this modelname
  observer.on(new RegExp(domainEvents.remoteObjectInquiry()), function (event) {
    const notifyEvent = domainEvents.remoteObjectLocated(
      event.relation.modelName
    );
    const ds = getDataSource(event.relation.modelName);

    if (!ds) {
      console.warn("datasource not found", event);
      return;
    }

    const result = relationType[event.relation.type](
      event.model,
      ds,
      event.relation
    );

    if (result) {
      observer.notify(notifyEvent, {
        eventName: notifyEvent,
        result,
      });
    }
  });

  return Object.keys(relations)
    .map(function (relation) {
      const rel = relations[relation];
      try {
        // relation type unknown
        if (!relationType[rel.type]) {
          console.warn("invalid relation", rel);
          return;
        }

        return {
          async [relation]() {
            // If the model is hosted on a remote instance
            if (!isLocalObject(rel.modelName))
              // broadcast the query to other instances and wait for a response.
              await requireRemoteObject(this, rel, observer);
            const ds = dataSource.getFactory().getDataSource(rel.modelName);
            return relationType[rel.type](this, ds, rel);
          },
        };
      } catch (e) {
        console.error(e);
      }
    })
    .reduce((c, p) => ({ ...p, ...c }));
}
