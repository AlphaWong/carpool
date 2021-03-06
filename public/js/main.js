var order_colors = [
    '#d33d29',
    '#f69730',
    '#72b026',
    '#38aadd',
    '#d252b9',
  ],
  cur_order_color = 0,
  line_colors = {
    'a': '#F00',
    'b': '#00A',
  },
  orders = {},
  vehicles = {},
  original_vehicle_locations = {},
  has_orders = false,
  has_vehicles = false,
  has_assigned = false,
  is_moving = 0,
  line_arr = {},
  real_routes = {},
  passed_polyline = {},
  assign_criteria = 'duration',
  restrictions = {
    duration: 2,
    distance: 2
  },
  animation_type = 'linear';

function initMap() {
  var btns = $('.btn');
  var map = new AMap.Map('container', {
    center: [114.127439, 22.3746645],
    mapStyle: 'fresh',
    zoom: 10
  });

  // user interaction
  $('.create_orders').on('click', function() {
    btns.prop('disabled', true);
    removeOrders();
    removePassedLine();
    $('.order_tr').remove();
    var num_orders = Math.ceil(Math.random() * 5);
    createOrders(num_orders).done(function() {
      has_orders = true;
      $('.create_orders, .get_vehicles').prop('disabled', false);
      if (has_orders && has_vehicles) {
        $('.assign_orders').prop('disabled', false);
        $('.control_options').removeClass('hide');
      }
    })
  });
  $('.get_vehicles').on('click', function() {
    btns.prop('disabled', true);
    removeVehicles();
    removePassedLine();
    $('.vehicle_tr').remove();
    getVehicles().done(function() {
      has_vehicles = true;
      $('.create_orders, .get_vehicles').prop('disabled', false);
      if (has_orders && has_vehicles) {
        $('.assign_orders').prop('disabled', false);
        $('.control_options').removeClass('hide');
      }
    });
  });
  $('.assign_orders').on('click', function() {
    btns.prop('disabled', true);
    $('.control_options').addClass('hide');
    removePassedLine();
    assignOrders();
  });
  $('.start_over').on('click', function() {
    $('.start_over, .assign_orders').prop('disabled', true);
    $('.control_options').addClass('hide');
    removeOrders();
    removeVehicles();
    removePassedLine();
    map.clearMap();
    $('.order_table').addClass('hide');
    $('.vehicle_table').addClass('hide');
  });
  $('.criteria').on('change', function() {
    assign_criteria = $(this).filter(':checked').val();
  });
  $('.animation_type').on('change', function() {
    animation_type = $(this).filter(':checked').val();
  });
  $('.restrictions, .restriction_values').on('change', function() {
    restrictions = {};
    $('.restrictions:checked').each(function() {
      restrictions[$(this).val()] = $('.restrict_value_' + $(this).val()).val();
    });
  });

  /*********************************
   * functions below
   * *******************************/

  /**
   * create random order
   */
  function createOrder() {
    return $.ajax({
      url: '/orders/create-random',
      dataType: 'jsonp',
      jsonp: 'jsonp',
    }).done(function(res) {
      console.log('Order:', res);
      var start = new AMap.Marker({
        map: map,
        icon: new AMap.Icon({
          image: '/imgs/mbg-fs8.png',
          imageOffset: new AMap.Pixel(-36 * cur_order_color, 0),
          size: new AMap.Size(36, 46)
        }),
        offset: new AMap.Pixel(-15, -44),
        position: res.pickup_lng_lat
      });
      var end = new AMap.Marker({
        map: map,
        icon: new AMap.Icon({
          image: '/imgs/mbg-fs8.png',
          imageOffset: new AMap.Pixel(-36 * cur_order_color, -46),
          size: new AMap.Size(36, 46)
        }),
        offset: new AMap.Pixel(-15, -44),
        position: res.dropoff_lng_lat
      });
      orders[res.id] = res;
      orders[res.id]['start'] = start;
      orders[res.id]['end'] = end;
      orders[res.id]['color'] = order_colors[cur_order_color];
      insertTableOrder(orders[res.id]);
      cur_order_color = (cur_order_color + 1) % 5;
    }).fail(function(err, b) {
      alert('Oops... Somthing went wrong :( \nTry refreshing the page.');
    });
  }
  /**
   * insert order data into table
   */
  function insertTableOrder(data) {
    $('.order_table').removeClass('hide');
    $('.order_table tbody').append("<tr class='order_tr info'><th><span style='background-color:" + data.color + "'>&nbsp;&nbsp;&nbsp;&nbsp;</span></th><td>" +
      data.service_type + "</td><td>" +
      data.pickup_time + "<br><span style='font-size:10px'>[" + data.pickup_lng_lat.map(function(s) {
        return Number(s).toFixed(8);
      }) + "]</span></td><td>" +
      data.delivery_time + "<br><span style='font-size:10px'>[" + data.dropoff_lng_lat.map(function(s) {
        return Number(s).toFixed(8);
      }) + "]</span></td><td class='delay_td_" + data.id + "'></td></tr>");
  }

  /**
   * create multiple orders and return promise, will be resolved when all finished
   */
  function createOrders(num) {
    var promise = $.Deferred();
    var remain = num;
    for (var i = 0; i < num; i++) {
      createOrder().done(function() {
        remain--;
        if (remain <= 0) {
          promise.resolve();
        }
      });
    }
    return promise.promise();
  }

  /**
   * create two random vehicle
   */
  function getVehicles() {
    return $.ajax({
      url: '/vehicles/random',
      dataType: 'jsonp',
      jsonp: 'jsonp',
    }).done(function(data) {
      console.log('Vehicles:', data);
      insertTableVehicle(data);
      Object.keys(data).map(function(k) {
        vehicles[k] = new AMap.Marker({
          map: map,
          icon: new AMap.Icon({
            image: '/imgs/mbg-fs8.png',
            imageOffset: new AMap.Pixel(-36 * 12, k == 'a' ? 0 : -46),
            size: new AMap.Size(36, 46)
          }),
          offset: new AMap.Pixel(-15, -44),
          position: data[k]
        });
        original_vehicle_locations[k] = vehicles[k].getPosition();
        vehicles[k].on('moving', function(e) {
          passed_polyline[k].setPath(e.passedPath);
        });
        vehicles[k].on('moveend', function(e) {
          var xl = animation_type == 'linear' ? line_arr : real_routes;
          if (vehicles[k].getPosition() == xl[k][xl[k].length - 1]) {
            is_moving--;
            if (is_moving <= 0) {
              btns.prop('disabled', false);
              $('.control_options').removeClass('hide');
            }
          }
        });
      });
    }).fail(function() {
      alert('Oops... Somthing went wrong :( \nTry refreshing the page.');
    });
  }

  /**
   * insert vehicle data into table
   */
  function insertTableVehicle(data) {
    $('.vehicle_table').removeClass('hide');
    Object.keys(data).map(function(k) {
      $('.vehicle_table tbody').append("<tr class='vehicle_tr success'><th>V" + k + "</th><td>" +
        "[" + data[k].map(function(s) {
          return Number(s).toFixed(8);
        }).join(',<br>') + "]</td><td class='sequence_td_" + k + "'></td></tr>");
    });
  }

  /**
   * submit assign order request
   */
  function assignOrders() {
    var data = {
      order_ids: Object.keys(orders),
      vehicles: Object.keys(vehicles).map(function(k) {
        var position = original_vehicle_locations[k];
        return [position.lng, position.lat];
      }),
      criteria: assign_criteria,
      conditions: restrictions
    };
    return $.ajax({
      url: '/orders/assign',
      dataType: 'jsonp',
      jsonp: 'jsonp',
      data: data
    }).done(function(solution) {
      has_assigned = true;
      console.log('Assign:', solution);
      var sequence = solution['sequence'];
      ['a', 'b'].map(function(k) {
        var v = k == 'a' ? 0 : 1;
        insertSequenceInfo(sequence[v], k);
        line_arr[k] = [];
        line_arr[k].push(original_vehicle_locations[k]);
        for (var i = 0; i < sequence[v].length; i++) {
          var index = sequence[v][i].split('_');
          line_arr[k].push(orders[index[0]][index[1]].getPosition());
        }
        console.log('Assigned to ' + k + ': ', line_arr[k]);
        // draw path
        passed_polyline[k] = new AMap.Polyline({
          map: map,
          // path: lineArr,
          strokeColor: line_colors[k],
          strokeOpacity: 0.6,
          strokeWeight: 3,
        });
        if (line_arr[k].length <= 1) {
          return;
        }
        if (animation_type == 'linear') {
          vehicles[k].moveAlong(line_arr[k], 10000);
          is_moving++;
        } else {
          AMap.service('AMap.Driving', function() {
            var driving = new AMap.Driving({
              map: map,
              city: '香港'
            });
            driving.search(line_arr[k][0], line_arr[k][line_arr[k].length - 1], {
              waypoints: line_arr[k].slice(1, -1)
            }, function(status, data) {
              driving.clear();
              if (status != 'complete') {
                return;
              }
              real_routes[k] = [];
              for (var r = 0; r < data.routes.length; r++) {
                var route = data.routes[r];
                for (var s = 0; s < route.steps.length; s++) {
                  var step = route.steps[s];
                  for (var p = 0; p < step.path.length; p++) {
                    real_routes[k].push(step.path[p]);
                  }
                }
              }
              vehicles[k].moveAlong(real_routes[k], 10000);
              is_moving++;
            });
          });
        }
      });
      insertDelayInfo(solution['delay']);
    }).fail(function() {
      alert('Oops... Somthing went wrong :( \nTry refreshing the page.');
    });
  }

  /**
   * insert sequence data into vehicle table
   */
  function insertSequenceInfo(data, k) {
    var str_sequence = data.map(function(elt) {
      var index = elt.split('_');
      return "<span style='background-color:" + orders[index[0]]['color'] + "'>&nbsp;" + index[1] + "&nbsp;</span>";
    }).join(' -> ', data);
    $('.sequence_td_' + k).empty().append(str_sequence);
  }

  /**
   * update delay info for each order
   */
  function insertDelayInfo(data) {
    Object.keys(data).map(function(order_id) {
      $('.delay_td_' + order_id).text('' + Math.max(0, data[order_id] / 60) + ' mins');
    });
  }

  /**
   * remove orders from map
   */
  function removeOrders() {
    Object.keys(orders).map(function(k) {
      orders[k]['start'].setMap(null);
      orders[k]['end'].setMap(null);
    });
    has_orders = false;
    orders = {};
  }

  /**
   * remove multiple orders and resolve promise when all finished
   */
  function finishOrders(orders) {
    var promise = $.Deferred();
    var order_ids = Object.keys(orders);
    var remain = order_ids.length;
    for (var i = 0; i < num; i++) {
      $.ajax({
        url: '/orders/finish/' + order_ids[i],
        dataType: 'jsonp',
        jsonp: 'jsonp',
      }).done(function() {
        remain--;
        if (remain <= 0) {
          promise.resolve();
        }
      }).fail(function(err, b) {
        alert('Oops... Somthing went wrong :( \nTry refreshing the page.');
      });
    }
    return promise.promise();
  }

  /**
   * remove vehicles from map
   */
  function removeVehicles() {
    Object.keys(vehicles).map(function(k) {
      vehicles[k].setMap(null);
    });
    has_vehicles = false;
    vehicles = {};
  }
  /**
   * remove passed line from map
   */
  function removePassedLine() {
    Object.keys(passed_polyline).map(function(k) {
      passed_polyline[k].setMap(null);
    });
    passed_polyline = {};
    has_assigned = false;
  }
}
