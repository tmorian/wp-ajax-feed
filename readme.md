# Ajax Feed Javascript Package

Example Usage

    let portfolioFeed = new AjaxFeed({
    	'baseUrl': site_info.ajax_url,
    	'action': 'portfolio_feed',
    	'container': $('.portfolio-feed'),
    	'filterForms': $('.portfolio-feed-filters'),
    	'paginationContainer':$('.portfolio-feed-pagination'),
    	'paginationDataAttribute': 'data-ajax-page',
    	'submitOnFilterUpdate': false,
    });

Example Server Response

    let response = {
    	'html': 'HTML Response that will populate the container',
    	'pagination': 'HTML response that will populate the pagination container',
    	'currentPage': 'the current page',
    	'maxPages': 'the total amount of pages in the current query'
    	'posts':'The raw post data that was returned by the query'
    };

[Settings](https://www.notion.so/a3595fcd2d7f49d4b12c23a61a771460)

[Methods](https://www.notion.so/3c65e86f31b049b0a9ef0220d797a72d)

[Events](https://www.notion.so/b15c704583c343d8aba1f3231ada5aa4)