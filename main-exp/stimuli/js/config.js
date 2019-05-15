const aggFunctions = ["Count", "Sum", "Maximum", "Minimum", "Average", "Median", "Standard Deviation", "Interquartile Range"];

const aggNameToFullname = {
  "avg": "Average",
  "median": "Median",
  "sum": "Sum",
  "count": "Count",
  "max" : "Maximum",
  "min" : "Minimum",
  "stdev" : "Standard Deviation",
  "iqr" : "Interquartile Range"
};

function verboseAggFunc(aggName){
  if (aggName==="Standard Deviation") {
    return "One Standard Deviation with Average";
  } else if (aggName==="Interquartile Range") {
    return "Interquartile Range with Median";
  } else {
    return aggName;
  }
}
const problemSpec = {
  "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
  "mark": "circle",
  "encoding": {
    "x": {
      "field": "label",
      "type": "nominal",
      "axis": {
        "title": "Data",
        "labels": false
      }
    },
    "y": {
      "field": "value",
      "type": "quantitative",
      "axis": {
        "title": "Value",
        "tickCount": 5
      }
    },
    "size": {"value": 60}
  },
  "width": 80,
  "height": 250
};
const choiceSpec = {
  "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
  "mark": "circle",
  "encoding": {
    "x": {
      "field": "label",
      "type": "nominal",
      "axis": {
        "title": null,
        "labels": true,
        "labelAngle": 0
      }
    },
    "y": {
      "field": "value",
      "type": "quantitative",
      "axis": {
        "title": null,
        "tickCount": 5
      }
    },
    "size": {"value": 60}
  },
  "width": 150,
  "height": 250,
};
const choiceSpecRange = {
  "$schema": "https://vega.github.io/schema/vega/v3.0.json",
  "autosize": "pad",
  "padding": 5,
  "width": 150,
  "height": 250,
  "style": "cell",
  "data": [
    {
      "name": "source_0",
    },
    {
      "name": "data_1",
      "source": "source_0",
      "transform": [
        {
          "type": "formula",
          "expr": "toNumber(datum[\"upper\"])",
          "as": "upper"
        },
        {
          "type": "formula",
          "expr": "toNumber(datum[\"lower\"])",
          "as": "lower"
        },
        {
          "type": "filter",
          "expr": "datum[\"upper\"] !== null && !isNaN(datum[\"upper\"])"
        }
      ]
    },
    {
      "name": "data_2",
      "source": "source_0",
      "transform": [
        {
          "type": "formula",
          "expr": "toNumber(datum[\"middle\"])",
          "as": "middle"
        },
        {
          "type": "filter",
          "expr": "datum[\"middle\"] !== null && !isNaN(datum[\"middle\"])"
        }
      ]
    }
  ],
  "marks": [
    {
      "name": "layer_0_marks",
      "type": "rect",
      "style": [
        "bar"
      ],
      "from": {
        "data": "data_1"
      },
      "encode": {
        "update": {
          "fill": {
            "value": "#aaa"
          },
          "x": {
            "scale": "x",
            "field": "label"
          },
          "width": {
            "scale": "x",
            "band": true
          },
          "y": {
            "scale": "y",
            "field": "upper"
          },
          "y2": {
            "scale": "y",
            "field": "lower"
          }
        }
      }
    },
    {
      "name": "layer_1_marks",
      "type": "rect",
      "style": [
        "tick"
      ],
      "from": {
        "data": "data_2"
      },
      "encode": {
        "update": {
          "opacity": {
            "value": 1
          },
          "fill": {
            "value": "#000"
          },
          "xc": {
            "scale": "x",
            "field": "label",
            "band": 0.5
          },
          "yc": {
            "scale": "y",
            "field": "middle"
          },
          "width": {
            "value": 30
          },
          "height": {
            "value": 1
          }
        }
      }
    }
  ],
  "scales": [
    {
      "name": "x",
      "type": "band",
      "domain": {
        "fields": [
          {
            "data": "data_1",
            "field": "label"
          },
          {
            "data": "data_2",
            "field": "label"
          }
        ],
        "sort": true
      },
      "range": [
        0,
        {
          "signal": "width"
        }
      ],
      "paddingInner": 0.2,
      "paddingOuter": 0.2
    },
    {
      "name": "y",
      "type": "linear",
      "domain": [
        0,
        4.5
      ],
      "range": [
        {
          "signal": "height"
        },
        0
      ],
      "nice": true,
      "zero": false
    }
  ],
  "axes": [
    {
      "scale": "x",
      "orient": "bottom",
      "zindex": 1,
      "encode": {
        "labels": {
          "update": {
            "align": {
              "value": "center"
            },
            "baseline": {
              "value": "top"
            }
          }
        }
      }
    },
    {
      "scale": "y",
      "orient": "left",
      "labelOverlap": true,
      "tickCount": 5,
      "zindex": 1
    },
    {
      "scale": "y",
      "orient": "left",
      "domain": false,
      "grid": true,
      "labels": false,
      "maxExtent": 0,
      "minExtent": 0,
      "tickCount": 5,
      "ticks": false,
      "zindex": 0,
      "gridScale": "x"
    }
  ],
  "config": {
    "axisY": {
      "minExtent": 30
    }
  }
};