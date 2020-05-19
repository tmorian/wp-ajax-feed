import * as populate from './lib/populate';
import deparam from './lib/deparam';

export default class AjaxFeed {

    constructor(settings = {}) {

        this.filtersAreDirty = false;
        this.initalPage = false;
        this.appendNextHTML = false;

        //Map default options to the provided options
        this.options = {
            'name': settings.name ? settings.name : 'ajax-feed',
            'baseUrl': settings.baseUrl ? settings.baseUrl : null,
            'action': settings.action ? settings.action : null,
            'container': settings.container ? settings.container : null,
            'filterForms': settings.filterForms ? settings.filterForms : null,
            'paginationContainer': settings.paginationContainer ? settings.paginationContainer : null,
            'paginationDataAttribute': settings.paginationDataAttribute ? settings.paginationDataAttribute : 'data-ajax-page',
            'loadMoreDataAttribute': settings.loadMoreDataAttribute ? settings.loadMoreDataAttribute : 'data-load-more',
            'submitOnFilterUpdate': settings.submitOnFilterUpdate ? settings.submitOnFilterUpdate : false,
        };

        //Options tht are required for the feed to work
        this.requiredOptions = ['baseUrl', 'action'];

        if (!this.validateOptions()) {
            console.log('Required options missing.');
        } else {
            this.getInitialParameters();
            let additionalFilters = this.initalPage ? {paged: this.initalPage} : {};
            this.bindEvents();
            this.getFeed(additionalFilters);
        }
    }

    validateOptions() {

        let _this = this,
            validates = true;

        this.requiredOptions.forEach(option => {
            if (!_this.options[option]) validates = false;
        });

        return validates;
    }

    geteventName(name) {
        return this.options.name + '/' + name;
    }

    /**
     * Get params form the URL and and update the filter forms
     */
    getInitialParameters() {
        let params = deparam(window.location.search.substr(1));
        if (params.paged && parseInt(params.paged) > 1) this.initalPage = parseInt(params.paged);

        $(this.options.filterForms).each((i, form) => {
                populate(form, params);
                $(form).find('select').each((index, el) => {
                    if (el.selectize && params[el.name] && el.selectize.options[params[el.name]]) el.selectize.setValue(params[el.name]);
                });
            }
        );

        $(window).trigger('formUpdatedFromURL', params);
    }

    /**
     * Get the feed
     * Add additional filters and
     * exclude the filter forms if necessary
     * @param additionalFilters
     * @param useFilterForms
     */
    getFeed(additionalFilters = {}, useFilterForms = true) {

        //Before update Event
        $(window).trigger(this.geteventName('beforeFeedUpdate'), this);

        this.filters = [];

        //Get filters from the filter forms
        if (useFilterForms) this.filters = $(this.options.filterForms).serializeArray();

        //Add additional options to the filters array
        Object.keys(additionalFilters).map((key, index) => {
            this.filters.push({
                'name': key,
                'value': additionalFilters[key],
            });
        });

        //Submit the request
        $.ajax(
            {
                type: 'post',
                url: this.options.baseUrl + '?action=' + this.options.action,
                data: $.param(this.filters),
            })
            .done((res) => {
                this.handleResponse(res);
            })
            .fail((data) => {
                $(window).trigger(this.geteventName('onError'), data);
            })
    };

    handleResponse(res) {

        //After update Event
        $(window).trigger(this.geteventName('afterFeedUpdate'), this);

        if (this.options.container) {

            if (this.appendNextHTML) {

                $(this.options.container).append(res.html);

            } else {

                $(this.options.container).html(res.html);
            }

        }

        //Set the HTML of the pagination
        if (this.options.paginationContainer) $(this.options.paginationContainer).html(res.pagination);

        if (this.filters[0] && this.filtersAreDirty) {
            window.history.pushState(
                this.filters,
                '',
                window.location.href.split('?')[0] + '?' + $.param(this.filters)
            );
        }

        let loadMoreBtns = $(`*[${this.options.loadMoreDataAttribute}]`);

        loadMoreBtns.attr(this.options.loadMoreDataAttribute, ++res.currentPage);

        if (res.currentPage > res.maxPages) {
            loadMoreBtns.hide();
        } else {
            loadMoreBtns.show();
        }
        this.appendNextHTML = false;
    }

    bindEvents() {

        let _this = this;

        //Updating on pagination change
        $(document).on('click', `*[${this.options.paginationDataAttribute}]`, function (e) {
            e.preventDefault();
            _this.filtersAreDirty = true;

            _this.getFeed({
                'paged': $(this).attr(_this.options.paginationDataAttribute),
            });
        });

        //Updating on load more click
        $(document).on('click', `*[${this.options.loadMoreDataAttribute}]`, function (e) {
            e.preventDefault();
            _this.filtersAreDirty = true;
            _this.appendNextHTML = true;

            _this.getFeed({
                'paged': $(this).attr(_this.options.loadMoreDataAttribute),
            });
        });

        //Tracking the modified status of the filters
        $(this.options.filterForms).change((e) => {
            this.filtersAreDirty = true;
        });

        //Updating on filter form submit
        $(this.options.filterForms).submit((e) => {
            e.preventDefault();
            this.getFeed();
        });

        //Updating on filter form change
        if (this.options.submitOnFilterUpdate) {

            $(this.options.filterForms).change((e) => {

                e.preventDefault();
                this.getFeed();
            });
        }
    }
}
