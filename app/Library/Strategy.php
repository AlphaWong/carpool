<?php

namespace App\Library;

use App\DataTypes\Order;

/**
 * strategy of assigning orders
 */
class Strategy
{
    private static $sub_section_distances;

    /**
     * basic strategy
     * @param  array $orders
     * @param  array $vehicles
     * @return 0 or 1 (vehicle index)
     */
    public static function basic($order_ids, $vehicles)
    {
        if (empty($order_ids) || count($vehicles) !== 2) {
            return;
        }
        // get all sub-section distances from map api (高德地图),
        // it needs 2 * count(order_ids) requests, which is kinda expensive
        // considering make it happen in client side ?

        //self::subSectionDistances($order_ids, $vehicles);

        // get all possible splits of orders
        $splits = self::splits($order_ids);
        foreach ($splits as $s) {
            $sequences_vehicle_0 = self::sequences($s[0]);
            $sequences_vehicle_1 = self::sequences($s[1]);
            var_dump($s[0], $sequences_vehicle_0, $s[1], $sequences_vehicle_1);exit;
        }
        var_dump($splits);exit;

        $total_duration = [
            0 => 0,
            1 => 0,
        ];
        $total_distance = [
            0 => 0,
            1 => 0,
        ];
        /**
         * don't consider time
         * 1. consider 1 order(done)
         * 2. consider 2 orders:
         */
        foreach ($orders as $order) {
            $distances = Location::distance($vehicles, [$order->pickup_lng, $order->pickup_lat]);
            foreach ($distances as $distance) {
                // not accessible
                if (isset($item->info)) {
                    continue;
                }
                // 一个订单不需要考虑 该订单的开始-结束花费，只需要考虑pickup的
                $total_distance[$distance->origin_id - 1] += $distance->distance;
                $total_duration[$distance->origin_id - 1] += $distance->duration;
            }
        }
        $least_duration    = array_keys($total_duration, min($total_duration));
        $shortest_distance = array_keys($total_distance, min($total_distance));
        var_dump($total_duration, $total_distance, $least_duration, $shortest_distance);
        exit;
    }

    /**
     * find out all possible ways of spliting given orders into two vehicles
     * @param array $order_ids
     * @return array of possible splits: [[order_ids_for_vehicle_a, order_ids_for_vehicle_b], ...]
     */
    public static function splits($order_ids)
    {
        // maximum&minimum number of orders a vehicle could have at a time
        $max_num_orders = min(3, count($order_ids));
        $min_num_orders = max(0, count($order_ids) - $max_num_orders);

        $splits = [];
        for ($i = $min_num_orders; $i <= $max_num_orders; $i++) {
            $splits_vehicle_a = math_combination($order_ids, $i);
            foreach ($splits_vehicle_a as $combination_a) {
                $splits[] = [$combination_a, array_diff($order_ids, $combination_a)];
            }
        }
        return $splits;
    }

    /**
     * find out all possible sequences for given orders
     * @param array order_ids
     * @return array e.g. ['order_1_start','order_2_start','order_2_end','order_1_end']
     */
    public static function sequences($order_ids)
    {
        $points = [];
        foreach ($order_ids as $id) {
            $points[] = [$id . '_start', $id . '_end'];
        }
        $sequences = math_sequence($points);
        return $sequences;
    }

    /**
     * find out all possible distance & duration between sub-sections of orders
     * @param array order_ids
     * @param array vehicles
     * @return array of start1 => [end1, end2, end3]
     * e.g. [
     *    'order1_start'=>[
     *        'order1_end'=>['distance'=> 100000, 'duration'=>3600],
     *        'order2_end'=>['distance'=>4600,'duration'=>600],
     *        'order2_start'=>['distance'=>7200,'duration'=>800],
     *     ],...
     *  ]
     */
    public static function subSectionDistances($order_ids, $vehicles)
    {
        if (isset(self::$sub_section_distances)) {
            return self::$sub_section_distances;
        }
        $points = [];
        foreach ($order_ids as $id) {
            $points[] = [$id . '_start', $id . '_end'];
        }
        $vectors = math_vector($points);

        $orders  = Order::getOrderById($order_ids);
        $mapping = [];
        foreach ($orders as $o) {
            $mapping[$o->id . '_start'] = [$o->pickup_lng, $o->pickup_lat];
            $mapping[$o->id . '_end']   = [$o->dropoff_lng, $o->dropoff_lat];
        }

        $result = [];
        foreach ($vectors as $end => $starts) {
            $end_lng_lat    = $mapping[$end];
            $starts_lng_lat = [];
            foreach ($starts as $s) {
                $starts_lng_lat[] = $mapping[$s];
            }
            $starts_lng_lat[] = $vehicles[0];
            $starts_lng_lat[] = $vehicles[1];
            $starts[]         = 'vehicle_0';
            $starts[]         = 'vehicle_1';
            $distances        = Location::distance($starts_lng_lat, $end_lng_lat);
            $to_starts        = array_combine($starts, $distances);
            // distances got from api is xx_end => xx_start, convert to xx_start => xx_end
            foreach ($to_starts as $start => $d) {
                if (!isset($result[$start])) {
                    $result[$start] = [];
                }
                $result[$start][$end] = $d;
            }
        }
        self::$sub_section_distances = $result;
        return self::$sub_section_distances;
    }
}
