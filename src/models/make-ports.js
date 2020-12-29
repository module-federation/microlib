"use strict";

import Model from "./model";

/**
 * Set an appropriate timeout interval and handler for the port.
 * @param {*} port
 * @param {*} ports
 * @param {*} model
 */
function setPortTimeout(port, ports, model) {
  // Set an appropriate timeout for the port
  const timeout = ports[port].timeout || 60000;

  if (timeout === 0) {
    return 0;
  }

  const timerId = setTimeout(function () {
    console.error("port operation timed out: %s", port);

    // Call the port's timeout handler if one is specified
    const timeoutCallback = ports[port].timeoutCallback;
    if (timeoutCallback) {
      timeoutCallback({
        port,
        model,
      });
    }
  }, timeout);

  return timerId;
}

/**
 * Register an event handler that invokes the `port`.
 */
function setPortEvent(port, ports, observer) {
  const eventName = ports[port].consumesEvent;
  const callback = ports[port].callback;

  if (eventName) {
    // listen for the triggering event to invoke this port
    observer.on(
      eventName,
      async function (model) {
        try {
          // Invoke this port and pass a callack if one is specified
          await model[port](callback);
        } catch (error) {
          throw new Error(error);
        }
      },
      false
    );
  }
}

/**
 *
 */
function handleError(port, ports, error) {
  console.error("port operation exception %s: %s", port, error.message);

  // Call the port's error handler if one is specified
  const errorCallback = ports[port].errorCallback;
  if (errorCallback) {
    errorCallback({
      port,
      model: self,
      error: error.message,
    });
  }
  throw new Error(error);
}

/**
 * Generate functions to handle I/O between
 * the domain and application layers. Each port
 * is assigned an adapter, which either invokes
 * the port (inbound) or is invoked by it (outbound).
 * Ports can be instrumented for exceptions and timeouts.
 * They can also be piped together in a control flow by
 * specifying the output event of one port as the input or
 * triggering event of another.
 *
 * See the `ModelSpecification` for port configuration options.
 *
 * @param {object} ports - object containing domain interfaces
 * @param {object} adapters - object containing application adapters
 * @param {import('../lib/observer').Observer} observer
 */
export default function makePorts(ports, adapters, observer) {
  if (!ports || !adapters) {
    console.warn("no ports or adapters configured");
    return;
  }

  return Object.keys(ports)
    .map(function (port) {
      const disabled = ports[port].disabled || !adapters[port];

      if (disabled) {
        console.warn("warning: port disabled or adapter missing: %s", port);
      } else {
        setPortEvent(port, ports, observer);
      }

      return {
        // The port function
        async [port](...args) {
          const self = this;

          // If the port is disabled, return
          if (disabled) {
            return;
          }

          const timerId = setPortTimeout(port, ports, self);

          try {
            // Call the adapter and wait
            const model = await adapters[port]({ model: self, args });

            // Stop the timer
            clearTimeout(timerId);

            // Record each invocation for undo
            Model.getPortFlow(self).push(port);

            // Signal the next task to run, unless undo is running
            if (!self.undo) {
              const m = model || self;
              await observer.notify(ports[port].producesEvent, m);
            }
          } catch (error) {
            handleError(error);
          }
        },
      };
    })
    .reduce((p, c) => ({
      ...c,
      ...p,
    }));
}
