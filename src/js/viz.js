$( document ).ready(function() {
  const DATA_URL = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_view&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1MnsOt9qrsgFmBakkEipXgElJze4B3CYUG36IB5zIdiE%2Fedit%3Fusp';
  var isMobile = $(window).width()<600? true : false;
  var categoryCount = 0;

  function getData() {
    loadData(DATA_URL, function (responseText) {
      parseData(JSON.parse(responseText));
    });
  }

  function loadData(dataPath, done) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () { return done(this.responseText) }
    xhr.open('GET', DATA_URL+dataPath, true);
    xhr.send();
  }

  function parseData(data) {
    //group the data by country
    var groupByCategory = d3.nest()
      .key(function(d){ return d['#category']; })
      .entries(data);
    categoryCount = groupByCategory.length;
    groupByCategory.sort(compare);
    createCategories(groupByCategory);

    //group the data by country
    // var groupByCountry = d3.nest()
    //   .key(function(d) { return d['#country+code+v_iso2']; })
    //   .key(function(d) { return d['#category']; })
    //   .key(function(d) { return d['#metric']; })
    //   .rollup(function(v) { return v[0]['#percentage']; })
    //   .entries(data);
    //   //.object(data);
    // console.log(groupByCountry);
    var groupByCountry = d3.nest()
      .key(function(d) { return d['#country+code+v_iso2']; })
      .key(function(d) { return d['#metric']; })
      .key(function(d) { return d['#category']; })
      .rollup(function(v) { return v[0]['#percentage']; })
      .entries(data);
    //console.log(groupByCountry);


    generateBarCharts(groupByCountry);
  }

  function createCategories(groupByCategory) {
    var icons = ['Affected-population', 'Coordination', 'Food-Security', 'Location', 'Health', 'People-in-need'];
    $('.charts').append("<div class='col-2 categories'><ul class='small'></ul></div>");

    groupByCategory.forEach(function(category, index) {
      $('.categories ul').append("<li>" + category.key + " <i class='humanitarianicons-" + icons[index] + "'></i></li>");
    });
  }

  function generateBarCharts(groupByCountry) {
    var chartName, chartData;
    groupByCountry.forEach(function(country) {
      chartName = country.key + "Chart";
      chartData = [];
      $('.charts').append("<div class='col-2 " + chartName + "'></div>");
      country.values.forEach(function(metric, index) {
        metric.values.sort(compare);
        var values = ['data'+(index+1)];
        metric.values.forEach(function(category) {
          values.push(Math.round(category.value*100));
        });
        chartData.push(values);

      });
      console.log('--',chartName, chartData);
      createBarChart(chartName, chartData);
    });

    //hide label if value is 0
    $('.c3-texts text').each(function( index ) {
      if ($(this).text() == 0) $(this).hide();
    });
  }

  function createBarChart(chartName, chartData) {
    var chart = c3.generate({
      title: { text: chartName },
      size: {
        height: 200
      },
      bindto: '.' + chartName,
      data: {
        columns: chartData,
        names: {
          data1: 'complete',
          data2: 'incomplete',
          data3: 'no data'
        },
        type: 'bar',
        labels: true,
        colors: {
          data1: '#007ce1',
          data2: '#c0d7eb',
          data3: '#e6e7e8'
        },
        groups: [
            ['data1', 'data2', 'data3']
        ],
        order: null
      },
      bar: {
        width: 15,
        // width: {
        //   ratio: 0.04
        // }
      },
      axis: {
        rotated: true,
        x: { show: false },
        y: {
          max: 100,
          min: 0,
          tick: {
            values: [0, 50, 100],
            outer: false
          },
          padding: {bottom: 0, top: 0}
        }
      },
      legend: {
        show: false
      },
      tooltip: {
        grouped: false,
        contents: function (d) {
          return '<div class="tooltip-custom">' + d[0].value + '% ' + d[0].name +'</div>';
        }
      }
    });
  }

  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = '';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});