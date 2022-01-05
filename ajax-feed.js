import * as populate from './lib/populate';
import deparam from './lib/deparam';
export default {
    init: function (settings) {
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
            'preload': settings.preload ? settings.preload : false,
        };
        //Options tht are required for the feed to work
        this.requiredOptions = ['baseUrl', 'action'];
        if (!this.validateOptions()) {
            console.log('Required options missing.');
        } else {
            this.getInitialParameters();
            let additionalFilters = this.initalPage ? {paging: this.initalPage} : {};
            this.bindEvents();
            if (!this.options.preload) {
                this.getFeed(additionalFilters);
            }
        }
        return this;
    },
    validateOptions: function () {
        let _this = this,
            validates = true;
        this.requiredOptions.forEach(function (option) {
            if (!_this.options[option]) validates = false;
        });
        return validates;
    },
    geteventName: function (name) {
        return this.options.name + '/' + name;
    },
    /**
     * Get params form the URL and and update the filter forms
     */
    getInitialParameters: function () {
        let params = deparam(window.location.search.substr(1));
        if (params.paging && parseInt(params.paging) > 1) this.initalPage = parseInt(params.paging);
        $(this.options.filterForms).each(function (i, form) {
                populate(form, params);
                $(form).find('select').each(function (index, el) {
                    if (el.selectize && params[el.name] && el.selectize.options[params[el.name]]) el.selectize.setValue(params[el.name]);
                });
            },
        );
        $(window).trigger('formUpdatedFromURL', params);
    },
    /**
     * Get the feed
     * Add additional filters and
     * exclude the filter forms if necessary
     * @param additionalFilters
     * @param useFilterForms
     */
    getFeed: function (additionalFilters, useFilterForms) {
        additionalFilters = (typeof additionalFilters !== 'undefined') ? additionalFilters : {};
        useFilterForms = (typeof useFilterForms !== 'undefined') ? useFilterForms : true;
        let _this = this;
        //Before update Event
        $(window).trigger(this.geteventName('beforeFeedUpdate'), this);
        if (this.options.container) $(this.options.container).addClass('ajax-feed-loading');
        this.filters = [];
        //Get filters from the filter forms
        if (useFilterForms) this.filters = $(this.options.filterForms).serializeArray();
        //Add additional options to the filters array
        Object.keys(additionalFilters).map(function (key, index) {
            _this.filters.push({
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
            .done(function (res) {
                _this.handleResponse(res);
            })
            .fail(function (data) {
                $(window).trigger(_this.geteventName('onError'), data);
            });
    },
    handleResponse: function (res) {
        //After update Event
        $(window).trigger(this.geteventName('afterFeedUpdate'), [this, res]);
        if (this.options.container) {
            $(this.options.container).removeClass('ajax-feed-loading');
            if (this.appendNextHTML) {
                $(this.options.container).append(res.html);
            } else {
                $(this.options.container).html(res.html);
            }
        }
        //Set the HTML of the pagination
        if (this.options.paginationContainer) $(this.options.paginationContainer).html(res.pagination);
        if (this.filters[0] && this.filtersAreDirty) {
            let urlFilters = this.filters.filter(val => val.value);
            urlFilters = urlFilters.map((f) => {
                if (f.name.endsWith('[]')) f.name = f.name.substring(0, f.name.length - 2);
                return f;
            });
            window.history.pushState(
                this.filters,
                '',
                window.location.href.split('?')[0] + '?' + $.param(urlFilters),
            );
        }
        let loadMoreBtns = $('*[' + this.options.loadMoreDataAttribute + ']');
        loadMoreBtns.attr(this.options.loadMoreDataAttribute, ++res.currentPage);
        if (res.currentPage > res.maxPages) {
            loadMoreBtns.hide();
        } else {
            loadMoreBtns.show();
        }
        this.appendNextHTML = false;
    },
    bindEvents: function () {
        let _this = this;
        //Updating on pagination change
        $(document).on('click', '*[' + this.options.paginationDataAttribute + ']', function (e) {
            e.preventDefault();
            _this.filtersAreDirty = true;
            _this.getFeed({
                'paging': $(this).attr(_this.options.paginationDataAttribute),
            });
        });
        //Updating on load more click
        $(document).on('click', '*[' + this.options.loadMoreDataAttribute + ']', function (e) {
            e.preventDefault();
            _this.filtersAreDirty = true;
            _this.appendNextHTML = true;
            _this.getFeed({
                'paging': $(this).attr(_this.options.loadMoreDataAttribute),
            });
        });
        //Tracking the modified status of the filters
        $(this.options.filterForms).change(function (e) {
            _this.filtersAreDirty = true;
        });
        //Updating on filter form submit
        $(this.options.filterForms).submit(function (e) {
            e.preventDefault();
            _this.getFeed();
        });
        //Updating on filter form change
        if (this.options.submitOnFilterUpdate) {
            $(this.options.filterForms).change(function (e) {
                e.preventDefault();
                _this.getFeed();
            });
        }
    },
};