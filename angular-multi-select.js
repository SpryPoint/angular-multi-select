/*
 Multiple-select directive for AngularJS
 (c) 2013 Alec LaLonde (https://github.com/alalonde/angular-multi-select)
 License: MIT
 */
(function (angular) {
    'use strict';

    angular.module('multi-select', ["template/multiSelect.html"])
        .directive('multiSelect', ['$q', '$parse', function ($q, $parse) {

            function appendSelected(entities) {
                var newEntities = [];
                angular.forEach(entities, function (entity) {
                    var appended = entity;
                    appended.selected = false;
                    newEntities.push(appended);
                });
                return newEntities;
            }

            return {
                restrict: 'E',
                require: 'ngModel',
                scope: {
                    selectedLabel: "@",
                    availableLabel: "@",
                    selectedPlaceholder:"@",
                    availablePlaceholder:"@",
                    available: "=",
                    disabled: "=",
                    model: "=ngModel",
                    config: "="
                },
                templateUrl: "template/multiSelect.html",
                link: function (scope, elm, attrs, controllers) {
                    scope.selected = {
                        available: [],
                        current: []
                    };

                    /* Filters out items in original that are also in toFilter. Compares by reference. */
                    function filterOut(original, toFilter) {
                        return difference(original, toFilter);
                    }

                    function parseExpression(item, expr) {
                        var displayComponents = expr.match(/(.+)\s+as\s+(.+)/);
                        var ctx = {};
                        ctx[displayComponents[1]] = item;
                        return $parse(displayComponents[2])(ctx);
                    }

                    var difference = function(array){
                       var rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));

                       var containsEquals = function(obj, target) {
                        if (obj == null) return false;
                        return _.any(obj, function(value) {
                          return _.isEqual(value, target);
                        });
                      };

                      return _.filter(array, function(value){ return ! containsEquals(rest, value); });
                    };

                    var requiredMin, inputModel;

                    function ensureMinSelected() {
                        if (requiredMin && scope.model) {
                            scope.numSelected = scope.model.length;
                            inputModel.$setValidity('min', scope.numSelected >= requiredMin);
                        }
                    }

                    scope.refreshAvailable = function () {
                        if (scope.model && scope.available) {
                            scope.available = filterOut(scope.available, scope.model);
                            scope.selected.available = appendSelected(scope.available);
                            scope.selected.current = appendSelected(scope.model);
                        }
                    };

                    scope.add = function () {
                        if (!scope.model.length && (scope.model.length !==0))
                            scope.model = [];
                        scope.model = scope.model.concat(scope.selected(scope.selected.available));
                    };
                    scope.addAll = function () {
                        if (!scope.model.length && (scope.model.length !==0)) {
                            scope.model = [];
                        }
                        scope.model = scope.model.concat(scope.available);
                    };
                    scope.remove = function () {
                        var selected = scope.selected(scope.selected.current);
                        scope.available = scope.available.concat(selected);
                        scope.model = filterOut(scope.model, selected);
                    };
                    scope.removeAll = function () {
                        scope.available = scope.available.concat(scope.model);
                        scope.model = filterOut(scope.model, scope.model);
                    };
                    scope.selected = function (list) {
                        var found = [];
                        angular.forEach(list, function (item) {
                            if (item.selected === true) found.push(item);
                        });
                        return found;
                    };

                    //Watching the model, updating if the model is a resolved promise
                    scope.watchModel = function () {
                        if (scope.model && scope.model.hasOwnProperty('$promise') && !scope.model.$resolved) {
                            scope.model.then(function (results) {
                                scope.$watch('model', scope.watchModel);
                            });
                        }
                        else {
                            scope.refreshAvailable();
                            scope.$watch('model', scope.refreshAvailable);
                        }
                    };

                    //Watching the list of available items. Updating if it is a resolved promise, and refreshing the
                    //available list if the list has changed
                    var _oldAvailable = {};
                    scope.watchAvailable = function () {
                        if (scope.available && scope.available.hasOwnProperty('$promise') && !scope.available.$resolved) {
                            scope.available.$promise.then(function (results) {
                                scope.$watch('available', scope.watchAvailable);
                            });
                        }
                        else {
                            //We only want to refresh the list if the list of available items has changed
                            //and the variable is defined
                            if (scope.available && scope.available != _oldAvailable) {
                                scope.refreshAvailable();
                                _oldAvailable = scope.available;
                            }
                        }
                    };

                    scope.$watch("available", scope.watchAvailable);
                    scope.$watch("model", scope.watchModel);
                    scope.$watch("searchAvailable", scope.watchAvailable);

                    scope.renderItem = function (item) {
                        return parseExpression(item, attrs.display);
                    };

                    scope.identifyItem = function (item) {
                        return parseExpression(item, attrs.identify);
                    };

                    scope.renderTitle = function (item) {
                        if (attrs.title) {
                            return parseExpression(item, attrs.title);
                        }
                        return "";
                    };

                    if (scope.config && angular.isDefined(scope.config.requiredMin)) {
                        var inputs = elm.find("input");
                        var validationInput = angular.element(inputs[inputs.length - 1]);
                        inputModel = validationInput.controller('ngModel');
                    }

                    scope.$watch('config.requiredMin', function (value) {
                        if (angular.isDefined(value)) {
                            requiredMin = parseInt(value, 10);
                            ensureMinSelected();
                        }
                    });

                    scope.$watch('model', function (selected) {
                        ensureMinSelected();
                    });
                }
            };
        }]);

    angular.module("template/multiSelect.html", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("template/multiSelect.html",
            '<div class="multiSelect">' +
            '<div class="select">' +
            '<label class="control-label" for="multiSelectAvailable">{{ availableLabel }} ' +
            '{{ availableLabel==""?"": "(" +available.length +")" }}</label>' +
            '<input ng-model="searchAvailable" class="search" placeholder="{{availablePlaceholder}}">' +
                '<ul class = "availableList">' +
                    '<li ng-repeat="entity in available|filter:searchAvailable track by $index" ng-class="{\'selected\':entity.selected}">' +
                        '<label class="checkbox" title="{{ renderTitle(entity) }}">' +
                            '<input type="checkbox" ng-disabled="disabled" ng-model="entity.selected"> ' +
                         '{{ renderItem(entity) }}' +
                        '</label>' +
                    '</li>' +
                '</ul>' +
            '</div>' +

            '<div class="select buttons">' +
                '<button class="btn mover right" ng-click="add()" title="Add selected" ' +
                    'ng-disabled="!selected(selected.available).length || disabled">' +
                    '<span class="glyphicon glyphicon-step-forward"></span>' +
                '</button>' +
                '<button class="btn mover right-all" ng-click="addAll()" title="Add all" ' +
                    'ng-disabled="!available.length || disabled">' +
                    '<span class="glyphicon glyphicon-fast-forward"></span>' +
                '</button>' +
                '<button class="btn mover left" ng-click="remove()" title="Remove selected" ' +
                    'ng-disabled="!selected(selected.current).length || disabled">' +
                    '<span class="glyphicon glyphicon-step-backward"></span>' +
                '</button>' +
                '<button class="btn mover left-all" ng-click="removeAll()" title="Remove all" ' +
                    'ng-disabled="!model.length || disabled">' +
                    '<span class="glyphicon glyphicon-fast-backward"></span>' +
                '</button>' +

                '</div>' +
            '<div class="select">' +
                '<label class="control-label" for="multiSelectSelected">{{ selectedLabel }} ' +
                    '{{selectedLabel==""?"":"("+model.length+")"}}</label>' +
                    '<input ng-model="searchSelected" class="search" placeholder="{{selectedPlaceholder}}">' +
                    '<ul class ="selectedList">' +
                        '<li ng-repeat="entity in model | filter:searchSelected track by $index">' +
                           '<label class="checkbox" title="{{ renderTitle(entity) }}">' +
                               '<input type="checkbox" ng-disabled="disabled" ng-model="entity.selected"> ' +
                                '{{ renderItem(entity) }}' +
                          '</label>' +
                        '</li>' +
                    '</ul>' +
                    '</ul>' +
            '</div>' +
            '<input type="number" name="numSelected" ng-model="numSelected" ' +
            'style="display: none">' +
            '</div>');
    }])
    ;
})(angular);
