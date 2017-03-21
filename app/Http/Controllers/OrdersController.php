<?php
namespace App\Http\Controllers;

use App\DataTypes\Order;
use Illuminate\Http\Request;

/**
 * order related api
 */
class OrdersController extends Controller
{
    /**
     * create order randomly
     * @param none
     * @return  json/jsonp
     */
    public function create(Request $request)
    {
        // pickup time is always end up with 0, 15, 30, 45
        $time_interval = config('app.pickup_time_interval');
        // pickup_time is in the next hour: curren_time < pickup_time <= current_time + 1 hrs
        $max_span_bt_now_pickup = config('app.max_span_bt_now_pickup');
        // deliveryTime - pickupTime
        $max_span_bt_pickup_delivery = config('app.max_span_bt_pickup_delivery');

        // random values:
        $pickup_timestamp   = (floor(time() / $time_interval) + mt_rand(1, $max_span_bt_now_pickup / $time_interval)) * $time_interval;
        $delivery_timestamp = $pickup_timestamp + mt_rand(1, $max_span_bt_pickup_delivery / $time_interval) * $time_interval;

        $input = [
            // service_type could be A, B, or C
            'service_type'    => chr(ord('A') + mt_rand(0, 2)),
            'pickup_time'     => date('Y-m-d H:i:s', $pickup_timestamp),
            'delivery_time'   => date('Y-m-d H:i:s', $delivery_timestamp),
            'pickup_lat_lng'  => $request->input('pickup_lat_lng'),
            'dropoff_lat_lng' => $request->input('dropoff_lat_lng'),
        ];
        $order    = Order::instance()->create($input);
        $response = response()->json($order);
        // jsonp
        if ($request->input('jsonp')) {
            $response->setCallback($request->input('jsonp'));
        }
        return $response;
    }

    /**
     * remove order on the map
     * @param int order_id
     * @return [type] [description]
     */
    public function remove($order_id)
    {

    }

    /**
     * assign an order to a specific vehicle
     * @param  int $order_id
     * @param  int $vehicle_id
     * @return boolean
     */
    public function match($order_id, $vehicle_id)
    {

    }
}
